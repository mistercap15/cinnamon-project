import type { Metadata } from 'next';
import { getProducts, commerceConfigured } from '../lib/shopify';
import { Shop } from './shop';
export const revalidate = 60;
export const metadata: Metadata = { title: 'Shop Ceylon cinnamon — CEYLON', description: 'Explore whole cinnamon quills and finely ground Ceylon cinnamon. A little warmth for your everyday.' };
export default async function ShopPage() { return <Shop products={await getProducts()} preview={!commerceConfigured()} />; }
