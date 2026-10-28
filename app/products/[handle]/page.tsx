import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, getProducts } from '../../lib/shopify';
import { ProductDetails } from './product-details';
import { ProductCard } from '../../components/product-card';
export const revalidate = 60;
type Props = { params: Promise<{ handle: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).handle);
  if (!product) return { title: 'Cinnamon not found — CEYLON' };
  return { title: `${product.seo.title || product.title} — CEYLON`, description: product.seo.description || product.description.slice(0, 160), openGraph: { images: product.featuredImage ? [product.featuredImage.url] : [] } };
}
export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).handle);
  if (!product) notFound();
  const related = (await getProducts()).filter(p => p.id !== product.id).slice(0, 2);
  return <main id="main-content"><ProductDetails product={product} />{related.length > 0 && <section className="section related-products"><p className="eyebrow">A LITTLE MORE TO LOVE</p><h2>Good company.</h2><div className="products">{related.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div></section>}</main>;
}
