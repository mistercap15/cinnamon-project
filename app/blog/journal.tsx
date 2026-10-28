'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Search } from 'lucide-react';
import { ArticleCard } from '../components/article-card';
import type { Article } from '../lib/types';

export function Journal({ articles, preview }: { articles: Article[]; preview: boolean }) {
  const [category, setCategory] = useState('All stories'), [query, setQuery] = useState(''), [limit, setLimit] = useState(9);
  const categories = ['All stories', ...new Set(articles.flatMap(a => a.tags))];
  const filtered = useMemo(() => articles.filter(a => (category === 'All stories' || a.tags.includes(category)) && `${a.title} ${a.excerpt} ${a.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [articles, category, query]);
  const featured = category === 'All stories' && !query.trim() ? filtered[0] : null;
  const cards = featured ? filtered.slice(1) : filtered;
  return <main id="main-content" className="journal-page"><section className="journal-intro"><p className="eyebrow">THE CEYLON JOURNAL / STORIES & SMALL WONDERS</p><h1>For the curious.<br /><em>And the unhurried.</em></h1><p>Stories from the island. Notes from the kitchen.<br />Little things worth making time for.</p><span className="journal-flower" aria-hidden="true">✳</span></section><section className="section journal-list"><div className="catalog-toolbar"><div className="filter-pills" role="group" aria-label="Filter stories by topic">{categories.map(c => <button key={c} aria-pressed={category === c} onClick={() => { setCategory(c); setLimit(9); }}>{c}</button>)}</div><label className="search-field"><Search size={16} /><span className="sr-only">Search stories</span><input type="search" placeholder="Follow your curiosity…" value={query} onChange={e => { setQuery(e.target.value); setLimit(9); }} /></label></div><p className="story-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'story' : 'stories'} to slow down with</p>
    {featured && <article className="featured-story"><Link href={`/blog/${featured.handle}`} className="featured-image" aria-label={`Read ${featured.title}`}><img src={featured.image?.url || '/images/heritage.jpg'} alt={featured.image?.altText || featured.title} /><span>THE SLOW READ / NO. 01</span></Link><div className="featured-copy"><p className="eyebrow">{featured.tags[0] || 'FROM THE JOURNAL'} <span>· {featured.readTime} MIN READ</span></p><h2><Link href={`/blog/${featured.handle}`}>{featured.title}</Link></h2><p>{featured.excerpt}</p><Link className="text-link" href={`/blog/${featured.handle}`}>Settle into the story <ArrowUpRight size={19} /></Link><span className="featured-flower" aria-hidden="true">✳</span></div></article>}
    {cards.length > 0 && <div className="journal-grid">{cards.slice(0, limit).map(article => <ArticleCard article={article} key={article.id} />)}</div>}
    {!filtered.length && <div className="catalog-empty"><span className="empty-flower">✳</span><h3>{articles.length ? 'Another story is waiting.' : 'The first chapter is on its way.'}</h3><p>{articles.length ? 'Try a different word, or wander through all our stories.' : 'Visit again soon for notes from our little island.'}</p>{articles.length > 0 && <button className="text-link" onClick={() => { setCategory('All stories'); setQuery(''); }}>Back to all stories <ArrowUpRight size={17} /></button>}</div>}
    {cards.length > limit && <button className="button dark load-more" onClick={() => setLimit(n => n + 9)}>A few more stories <ArrowDown size={16} /></button>}
    {preview && <p className="preview-note">An editorial preview · original sample stories from the Ceylon concept.</p>}
    </section><section className="journal-shop-note"><p className="eyebrow">FROM THE PAGE TO YOUR PANTRY</p><h2>A little inspiration.<br /><em>A little cinnamon.</em></h2><Link href="/shop" className="button dark">Explore the collection <ArrowUpRight size={18} /></Link></section></main>;
}
