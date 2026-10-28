'use client';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { firstVariant, money, type Product } from '../lib/types';
import { useBag } from './storefront';

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useBag();
  const variant = firstVariant(product);
  return <article className="product shop-product">
    <div className="product-image"><span className="product-number">0{index + 1} / {product.productType.toUpperCase()}</span><Link href={`/products/${product.handle}`} aria-label={`Discover ${product.title}`}><img src={product.featuredImage?.url || '/images/hero.jpg'} alt={product.featuredImage?.altText || product.title} loading="lazy" /></Link><span className="product-weight">{variant?.title === 'Default Title' ? 'CEYLON CINNAMON' : variant?.title}{product.demo && ' · PREVIEW'}</span><button disabled={!variant?.availableForSale} onClick={() => add(product)} aria-label={`Add ${product.title} to bag`}><span className="quick-add-label">Add to bag</span><Plus size={24} /></button></div>
    <div className="product-info"><div><span className="eyebrow">{product.productType}</span><Link href={`/products/${product.handle}`}><h3>{product.title}</h3></Link><p>{variant?.availableForSale ? 'A little everyday extraordinary.' : 'Currently out of stock'}</p></div>{variant && <span className="price">{product.variants.length > 1 && <small>FROM</small>}{money(product.variants.reduce((min, v) => Number(v.price.amount) < Number(min.price.amount) ? v : min, variant).price)}{product.demo && <small>PREVIEW PRICE</small>}</span>}</div>
  </article>;
}
