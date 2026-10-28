'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Leaf, Search } from 'lucide-react';
import { ProductCard } from '../components/product-card';
import { firstVariant, type Product } from '../lib/types';

export function Shop({ products, preview }: { products: Product[]; preview: boolean }) {
  const [category, setCategory] = useState('All cinnamon'), [query, setQuery] = useState(''), [sort, setSort] = useState('featured'), [limit, setLimit] = useState(12);
  const categories = ['All cinnamon', ...new Set(products.map(p => p.productType))];
  const filtered = useMemo(() => {
    const result = products.filter(p => (category === 'All cinnamon' || p.productType === category) && `${p.title} ${p.productType} ${p.description}`.toLowerCase().includes(query.trim().toLowerCase()));
    const price = (p: Product) => Math.min(...p.variants.map(v => Number(v.price.amount)));
    if (sort === 'price-asc') result.sort((a, b) => price(a) - price(b));
    if (sort === 'price-desc') result.sort((a, b) => price(b) - price(a));
    if (sort === 'name') result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [products, category, query, sort]);
  return <main id="main-content" className="shop-page">
    <section className="shop-intro"><div className="shop-intro-copy"><p className="eyebrow">THE CEYLON PANTRY / SHOP</p><h1>Good things.<br /><em>Small beginnings.</em></h1><p>A quill for the slow moments. A pinch for the everyday.<br />Find your own way to savour true cinnamon.</p><a href="#shop-collection" className="text-link">Find your little extraordinary <ArrowDown size={17} /></a></div><div className="shop-intro-image"><img src="/images/powder.jpg" alt="Cinnamon powder in a warm, sunlit still life" /><span className="shop-seal">A LITTLE<br /><b>✳</b>EVERYDAY WONDER</span></div><span className="intro-coordinate">06° N / 80° E · SRI LANKA</span></section>
    <div className="shop-values"><span><Leaf size={16} /> True Ceylon cinnamon</span><span>Whole & finely ground</span><span>A slower kind of everyday</span></div>
    <section id="shop-collection" className="section shop-catalog"><div className="catalog-heading"><div><p className="eyebrow">A PLACE IN YOUR PANTRY</p><h2>The little collection.</h2></div><p>Thoughtfully chosen.<br /><em>Beautifully simple.</em></p></div>
      <div className="catalog-toolbar"><div className="filter-pills" role="group" aria-label="Filter products by form">{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => { setCategory(c); setLimit(12); }}>{c}</button>)}</div><label className="search-field"><Search size={16} /><span className="sr-only">Search cinnamon</span><input value={query} onChange={e => { setQuery(e.target.value); setLimit(12); }} placeholder="Find your cinnamon…" type="search" /></label></div>
      <div className="catalog-count"><p aria-live="polite">{filtered.length} {filtered.length === 1 ? 'good thing' : 'good things'} to discover</p><label>Sort by <select aria-label="Sort products" value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option></select></label></div>
      {filtered.length ? <div className="products shop-products">{filtered.slice(0, limit).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="catalog-empty"><Leaf size={40} /><h3>{products.length ? 'A little further afield.' : 'Good things take a little time.'}</h3><p>{products.length ? 'Try another word or explore the full collection.' : 'Our collection is being prepared. Come back soon.'}</p>{products.length > 0 && <button className="text-link" onClick={() => { setQuery(''); setCategory('All cinnamon'); }}>See all cinnamon <ArrowUpRight size={17} /></button>}</div>}
      {filtered.length > limit && <button className="button dark load-more" onClick={() => setLimit(n => n + 12)}>Discover more <ArrowDown size={16} /></button>}
      {preview && <p className="preview-note">Preview collection · illustrative USD prices and pack sizes · purchases are not enabled.</p>}
    </section>
    <section className="shop-story"><img src="/images/heritage.jpg" alt="Cinnamon leaves in the light" loading="lazy" /><div><p className="eyebrow">MORE THAN AN INGREDIENT</p><h2>A story in<br /><em>every layer.</em></h2><p>From the island’s green heart to your favourite cup. Get to know the craft, the character, and the little rituals behind the cinnamon.</p><Link href="/blog" className="text-link">Take a slower read <ArrowUpRight size={18} /></Link></div></section>
  </main>;
}
