import "server-only";
import type { Article, Product } from "./types";
export const medusaEnabled = () => process.env.COMMERCE_PROVIDER === "medusa";
export const isDemo = () => process.env.DEMO_MODE === "true";
export class CommerceError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export async function medusa<T = any>(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const origin = process.env.MEDUSA_BACKEND_URL;
  if (!origin || !process.env.MEDUSA_PUBLISHABLE_KEY)
    throw new CommerceError(
      "The commerce service has not been configured.",
      503,
    );
  const url = new URL(path, origin);
  if (url.origin !== new URL(origin).origin)
    throw new CommerceError("Invalid commerce request.");
  const response = await fetch(url, {
    method: options.method || "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": process.env.MEDUSA_PUBLISHABLE_KEY,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new CommerceError(
      data.message || "The commerce service is temporarily unavailable.",
      response.status,
    );
  return data as T;
}
function mapProduct(p: any): Product {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    productType: p.type?.value || p.metadata?.form || "Cinnamon",
    description: p.description || "",
    featuredImage: p.thumbnail ? { url: p.thumbnail, altText: p.title } : null,
    images: (p.images || []).map((image: any) => ({
      url: image.url,
      altText: p.title,
    })),
    variants: (p.variants || [])
      .map((v: any) => ({
        id: v.id,
        title: v.title,
        availableForSale:
          (!v.manage_inventory ||
            v.allow_backorder ||
            v.inventory_quantity > 0) &&
          Boolean(v.calculated_price),
        price: {
          amount: String(v.calculated_price?.calculated_amount ?? 0),
          currencyCode: (
            v.calculated_price?.currency_code || "usd"
          ).toUpperCase(),
        },
      }))
      .sort(
        (a: any, b: any) => Number(a.price.amount) - Number(b.price.amount),
      ),
    seo: { title: null, description: null },
    demo: false,
  };
}
export async function medusaProducts(): Promise<Product[]> {
  const products: Product[] = [];
  let offset = 0;
  do {
    const data = await medusa(
      `/store/products?region_id=${encodeURIComponent(process.env.MEDUSA_REGION_ID || "")}&fields=*variants.calculated_price,+variants.inventory_quantity,*images,*type&limit=100&offset=${offset}`,
    );
    products.push(...data.products.map(mapProduct));
    offset += data.products.length;
    if (!data.products.length || offset >= data.count) break;
  } while (true);
  return products;
}
export async function medusaProduct(handle: string): Promise<Product | null> {
  const data = await medusa(
    `/store/products?handle=${encodeURIComponent(handle)}&region_id=${encodeURIComponent(process.env.MEDUSA_REGION_ID || "")}&fields=*variants.calculated_price,+variants.inventory_quantity,*images,*type`,
  );
  return data.products[0] ? mapProduct(data.products[0]) : null;
}
function mapArticle(p: any): Article {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    excerpt: p.excerpt,
    contentHtml: p.content_html,
    tags: [p.category],
    image: p.image ? { url: p.image, altText: p.title } : null,
    publishedAt: p.published_at,
    author: p.author,
    readTime: Math.max(
      1,
      Math.ceil(
        p.content_html.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200,
      ),
    ),
    seo: { title: null, description: null },
  };
}
export async function medusaArticles(): Promise<Article[]> {
  return (await medusa("/store/journal")).posts.map(mapArticle);
}
export async function medusaArticle(handle: string): Promise<Article | null> {
  try {
    return mapArticle(
      (await medusa(`/store/journal/${encodeURIComponent(handle)}`)).post,
    );
  } catch (error) {
    if (error instanceof CommerceError && error.status === 404) return null;
    throw error;
  }
}
