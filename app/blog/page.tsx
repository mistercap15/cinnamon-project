import type { Metadata } from 'next';
import { getArticles, commerceConfigured } from '../lib/shopify';
import { Journal } from './journal';
export const revalidate = 60;
export const metadata: Metadata = { title: 'The journal — CEYLON', description: 'Stories from the island, notes from the kitchen, and small rituals worth making time for.' };
export default async function BlogPage() { return <Journal articles={await getArticles()} preview={!commerceConfigured()} />; }
