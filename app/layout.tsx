import type { Metadata } from 'next';
import './globals.css';
import { Storefront } from './components/storefront';
import { commerceConfigured } from './lib/shopify';
export const metadata: Metadata = { metadataBase: new URL(process.env.SITE_URL || 'http://localhost:3000'), title: 'CEYLON — A little island. An extraordinary spice.', description: 'Discover the delicate world of Ceylon cinnamon. Whole quills, fine ground cinnamon, and everyday rituals.', robots: { index: commerceConfigured() && Boolean(process.env.SITE_URL), follow: commerceConfigured() && Boolean(process.env.SITE_URL) } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body><Storefront live={commerceConfigured()}>{children}</Storefront></body></html>; }
