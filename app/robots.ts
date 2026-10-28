import type { MetadataRoute } from 'next';
import { commerceConfigured } from './lib/shopify';
export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL;
  if (!commerceConfigured() || !site) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: new URL('/sitemap.xml', site).href };
}
