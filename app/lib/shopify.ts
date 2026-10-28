import 'server-only';
import { cache } from 'react';
import { demoArticles, demoProducts } from './demo';
import type { Article, Product, ProductImage, Variant } from './types';

export function commerceConfigured() { return Boolean(process.env.SHOPIFY_STORE_DOMAIN); }

export async function storefront<T>(query: string, variables: Record<string, unknown> = {}, uncached = false): Promise<T> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN ?? '';
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)) throw new Error('Set SHOPIFY_STORE_DOMAIN to your store.myshopify.com hostname.');
  const version = process.env.SHOPIFY_API_VERSION || '2026-10';
  if (!/^\d{4}-(01|04|07|10)$/.test(version)) throw new Error('Invalid Shopify API version.');
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  const response = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Shopify-Storefront-Access-Token': token } : {}) },
    body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(12000),
    ...(uncached ? { cache: 'no-store' as const } : { next: { revalidate: 60 } }),
  });
  if (!response.ok) throw new Error(`Shopify request failed (${response.status}).`);
  const result = await response.json();
  if (result.errors?.length || !result.data) throw new Error('Shopify could not load this content. Check storefront permissions and API configuration.');
  return result.data as T;
}

type ShopifyProduct = Omit<Product, 'images' | 'variants' | 'demo'> & { images: { nodes: ProductImage[] }; variants: { nodes: Variant[] } };
const productFields = `id handle title productType description seo { title description }
  featuredImage { url altText } images(first: 8) { nodes { url altText } }
  variants(first: 100) { nodes { id title availableForSale price { amount currencyCode } } }`;
function mapProduct(p: ShopifyProduct): Product { return { ...p, productType: p.productType || 'Cinnamon', images: p.images.nodes, variants: p.variants.nodes, demo: false }; }

export const getProducts = cache(async (): Promise<Product[]> => {
  if (!commerceConfigured()) return demoProducts;
  const products: Product[] = [];
  let cursor: string | null = null;
  do {
    const data: { products: { nodes: ShopifyProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } = await storefront(`query Products($after: String) { products(first: 50, after: $after, sortKey: TITLE) { nodes { ${productFields} } pageInfo { hasNextPage endCursor } } }`, { after: cursor });
    products.push(...data.products.nodes.map(mapProduct));
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);
  return products;
});

export const getProduct = cache(async (handle: string): Promise<Product | null> => {
  if (!commerceConfigured()) return demoProducts.find(p => p.handle === handle) ?? null;
  const data = await storefront<{ product: ShopifyProduct | null }>(`query Product($handle: String!) { product(handle: $handle) { ${productFields} } }`, { handle });
  return data.product ? mapProduct(data.product) : null;
});

type ShopifyArticle = Omit<Article, 'author' | 'readTime'> & { content: string; authorV2: { name: string } | null };
const articleFields = `id handle title excerpt content contentHtml tags publishedAt authorV2 { name } image { url altText } seo { title description }`;
function mapArticle(a: ShopifyArticle): Article {
  return { ...a, excerpt: a.excerpt || a.content.slice(0, 180), author: a.authorV2?.name || 'The Ceylon journal', readTime: Math.max(1, Math.ceil(a.content.split(/\s+/).length / 200)) };
}
export const getArticles = cache(async (): Promise<Article[]> => {
  if (!commerceConfigured()) return demoArticles;
  const articles: Article[] = [];
  let cursor: string | null = null;
  do {
    const data: { blog: { articles: { nodes: ShopifyArticle[]; pageInfo: { hasNextPage: boolean; endCursor: string } } } | null } = await storefront(`query Journal($handle: String!, $after: String) { blog(handle: $handle) { articles(first: 50, after: $after, sortKey: PUBLISHED_AT, reverse: true) { nodes { ${articleFields} } pageInfo { hasNextPage endCursor } } } }`, { handle: process.env.SHOPIFY_BLOG_HANDLE || 'journal', after: cursor });
    if (!data.blog) return [];
    articles.push(...data.blog.articles.nodes.map(mapArticle));
    cursor = data.blog.articles.pageInfo.hasNextPage ? data.blog.articles.pageInfo.endCursor : null;
  } while (cursor);
  return articles;
});
export const getArticle = cache(async (handle: string): Promise<Article | null> => {
  if (!commerceConfigured()) return demoArticles.find(a => a.handle === handle) ?? null;
  const data = await storefront<{ blog: { articleByHandle: ShopifyArticle | null } | null }>(`query Article($blog: String!, $handle: String!) { blog(handle: $blog) { articleByHandle(handle: $handle) { ${articleFields} } } }`, { blog: process.env.SHOPIFY_BLOG_HANDLE || 'journal', handle });
  return data.blog?.articleByHandle ? mapArticle(data.blog.articleByHandle) : null;
});
