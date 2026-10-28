import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { Article } from '../lib/types';

export function ArticleCard({ article }: { article: Article }) {
  return <article className="journal-card"><Link href={`/blog/${article.handle}`} className="journal-card-image" aria-label={`Read ${article.title}`}><img src={article.image?.url || '/images/heritage.jpg'} alt={article.image?.altText || article.title} loading="lazy" /><span>{article.tags[0] || 'Journal'}</span></Link><div className="article-meta"><span>{article.readTime} MIN READ</span><time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(article.publishedAt))}</time></div><h3><Link href={`/blog/${article.handle}`}>{article.title}</Link></h3><p>{article.excerpt}</p><Link className="text-link" href={`/blog/${article.handle}`}>Read the story <ArrowUpRight size={17} /></Link></article>;
}
