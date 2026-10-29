import type { MetadataRoute } from 'next';
import {isDemo} from './lib/medusa';
import { commerceConfigured } from './lib/shopify';
export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL;
  if (!commerceConfigured() || !site || isDemo()) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: new URL('/sitemap.xml', site).href };
}
