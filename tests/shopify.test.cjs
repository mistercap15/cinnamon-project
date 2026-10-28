// Exercise the TypeScript server modules directly with a mocked Shopify transport.
// No store credentials or real orders are used by these tests.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const loaded = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (loaded.has(filename)) return loaded.get(filename).exports;
  const module = new Module(filename);
  module.filename = filename; module.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = module.require.bind(module);
  module.require = name => {
    if (name === 'server-only') return {};
    if (name === 'react') return { cache: fn => fn };
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')));
    return originalRequire(name);
  };
  loaded.set(filename, module);
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return module.exports;
}
const api = load('app/lib/shopify.ts');
const { POST } = load('app/api/checkout/route.ts');
const { articleHtml } = load('app/lib/content.ts');
const originalFetch = global.fetch;
const originalDomain = process.env.SHOPIFY_STORE_DOMAIN;
const originalToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalDomain === undefined) delete process.env.SHOPIFY_STORE_DOMAIN; else process.env.SHOPIFY_STORE_DOMAIN = originalDomain;
  if (originalToken === undefined) delete process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN; else process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = originalToken;
});
function configure() { process.env.SHOPIFY_STORE_DOMAIN = 'ceylon-test.myshopify.com'; process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN = 'test-public-token'; }
function mock(result) { global.fetch = async () => Response.json({ data: result }); }
function checkout(lines) { return new Request('https://ceylon.example/api/checkout', { method: 'POST', headers: { origin: 'https://ceylon.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) }); }
const line = { merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 2 };

test('unconfigured store provides preview content and cannot create an order', async () => {
  delete process.env.SHOPIFY_STORE_DOMAIN;
  assert.equal((await api.getProducts()).length, 2);
  assert.ok((await api.getProducts()).every(p => p.demo));
  assert.equal((await api.getArticles()).length, 4);
  assert.equal((await POST(checkout([line]))).status, 503);
});
test('live products paginate and preserve variant prices, currency, and stock', async () => {
  configure(); let calls = 0;
  const product = { id: 'one', handle: 'ground', title: 'Ground', productType: 'Ground cinnamon', description: 'Fresh', seo: {}, featuredImage: null, images: { nodes: [] }, variants: { nodes: [{ id: line.merchandiseId, title: '100 g', availableForSale: false, price: { amount: '20.00', currencyCode: 'GBP' } }] } };
  global.fetch = async (url, init) => {
    assert.match(url, /ceylon-test\.myshopify\.com\/api\/2026-10\/graphql.json/);
    assert.equal(init.headers['X-Shopify-Storefront-Access-Token'], 'test-public-token');
    const input = JSON.parse(init.body);
    assert.equal(input.variables.after, calls === 0 ? null : 'next-page');
    calls++;
    return Response.json({ data: { products: { nodes: [{ ...product, id: String(calls) }], pageInfo: { hasNextPage: calls === 1, endCursor: 'next-page' } } } });
  };
  const products = await api.getProducts();
  assert.equal(products.length, 2); assert.equal(calls, 2);
  assert.equal(products[0].demo, false); assert.equal(products[0].variants[0].availableForSale, false);
  assert.equal(products[0].variants[0].price.currencyCode, 'GBP');
});
test('connected store failures never silently substitute preview products', async () => {
  configure(); global.fetch = async () => Response.json({ errors: [{ message: 'Access denied' }] });
  await assert.rejects(api.getProducts(), /Shopify could not load/);
  mock({ product: null }); assert.equal(await api.getProduct('missing'), null);
  mock({ blog: null }); assert.deepEqual(await api.getArticles(), []); assert.equal(await api.getArticle('missing'), null);
});
test('journal adapter maps published content, metadata, and reading time', async () => {
  configure();
  mock({ blog: { articles: { nodes: [{ id: 'story', handle: 'story', title: 'Story', content: 'word '.repeat(450), excerpt: '', contentHtml: '<p>A real story</p>', tags: ['Rituals'], publishedAt: '2026-10-01T00:00:00Z', authorV2: { name: 'Author' }, image: null, seo: { title: 'SEO title' } }], pageInfo: { hasNextPage: false } } } });
  const [article] = await api.getArticles(); assert.equal(article.author, 'Author'); assert.equal(article.readTime, 3); assert.equal(article.seo.title, 'SEO title'); assert.equal(article.contentHtml, '<p>A real story</p>');
});
test('checkout rejects bad quantities, duplicate IDs, preview IDs, and cross-origin requests', async () => {
  configure(); global.fetch = () => { throw new Error('Invalid input must not reach Shopify'); };
  for (const lines of [[], [{ ...line, quantity: 0 }], [{ ...line, quantity: 1.5 }], [{ ...line, quantity: 100 }], [{ ...line, merchandiseId: 'preview-quills-50' }], [line, line]]) assert.equal((await POST(checkout(lines))).status, 400);
  const request = new Request('https://ceylon.example/api/checkout', { method: 'POST', headers: { origin: 'https://unrelated.example' }, body: '{}' });
  assert.equal((await POST(request)).status, 403);
});
test('checkout uses Shopify pricing and returns a fresh hosted checkout URL', async () => {
  configure();
  global.fetch = async (url, init) => {
    assert.equal(init.cache, 'no-store');
    assert.deepEqual(JSON.parse(init.body).variables.input.lines, [line]);
    return Response.json({ data: { cartCreate: { cart: { checkoutUrl: 'https://ceylon-test.myshopify.com/checkouts/test', totalQuantity: 2 }, userErrors: [], warnings: [] } } });
  };
  const result = await POST(checkout([{ ...line, price: '0.01' }]));
  assert.equal(result.status, 200); assert.match((await result.json()).checkoutUrl, /^https:\/\//);
});
test('checkout surfaces unavailable inventory instead of silently changing the order', async () => {
  configure();
  mock({ cartCreate: { cart: { checkoutUrl: 'https://ceylon-test.myshopify.com/checkout', totalQuantity: 1 }, warnings: [{ message: 'Only one is available.' }], userErrors: [] } });
  const result = await POST(checkout([line])); assert.equal(result.status, 409); assert.equal((await result.json()).error, 'Only one is available.');
});
test('article HTML preserves editorial formatting and removes executable content', () => {
  const html = articleHtml('<h2>A heading</h2><p><em>A moment</em><script>alert(1)</script><a href="javascript:alert(1)">Link</a><img src="https://cdn.example/spice.jpg" onerror="alert(1)"><iframe src="https://bad.example"></iframe></p>');
  assert.match(html, /<h2>A heading<\/h2>/); assert.match(html, /<em>A moment<\/em>/); assert.match(html, /loading="lazy"/);
  assert.doesNotMatch(html, /<script|onerror|javascript:|<iframe|alert\(1\)/);
});
