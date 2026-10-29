import type { MetadataRoute } from 'next';
import {isDemo} from './lib/medusa';
import { commerceConfigured, getArticles, getProducts } from './lib/shopify';
export const revalidate = 60;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.SITE_URL;
  if (!commerceConfigured() || !site || isDemo()) return [];
  const [products, articles] = await Promise.all([getProducts(), getArticles()]);
  return [
    ...['/', '/shop', '/blog'].map(path => ({ url: new URL(path, site).href })),
    ...products.map(p => ({ url: new URL(`/products/${p.handle}`, site).href })),
    ...articles.map(a => ({ url: new URL(`/blog/${a.handle}`, site).href, lastModified: a.publishedAt })),
  ];
}
