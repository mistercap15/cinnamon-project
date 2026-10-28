import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { articleHtml } from '../../lib/content';
import { ArrowLeft, ArrowUpRight, Leaf } from 'lucide-react';
import { getArticle, getArticles } from '../../lib/shopify';
import { ArticleCard } from '../../components/article-card';
export const revalidate = 60;
type Props = { params: Promise<{ handle: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).handle);
  if (!article) return { title: 'Story not found — CEYLON' };
  return { title: `${article.seo.title || article.title} — CEYLON journal`, description: article.seo.description || article.excerpt, openGraph: { type: 'article', publishedTime: article.publishedAt, authors: [article.author], images: article.image ? [article.image.url] : [] } };
}
export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).handle);
  if (!article) notFound();
  const related = (await getArticles()).filter(a => a.id !== article.id).sort((a, b) => Number(b.tags.some(t => article.tags.includes(t))) - Number(a.tags.some(t => article.tags.includes(t)))).slice(0, 3);
  const html = articleHtml(article.contentHtml);
  return <main id="main-content" className="article-page"><article><div className="article-intro"><Link href="/blog" className="back-link"><ArrowLeft size={15} /> Back to the journal</Link><p className="eyebrow">{article.tags.join(' / ') || 'FROM THE JOURNAL'}</p><h1>{article.title}</h1><p className="article-deck">{article.excerpt}</p><div className="article-byline"><span>{article.author}</span><span>·</span><time dateTime={article.publishedAt}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(article.publishedAt))}</time><span>·</span><span>{article.readTime} min read</span></div></div><div className="article-cover"><img src={article.image?.url || '/images/heritage.jpg'} alt={article.image?.altText || article.title} /></div><div className="article-reading"><aside className="reading-aside"><Leaf size={25} /><p className="eyebrow">A MOMENT FOR<br />SOMETHING GOOD.</p><p>Put the kettle on.<br />Stay a little while.</p><Link href="/shop" className="text-link">Meet the cinnamon <ArrowUpRight size={16} /></Link></aside><div className="article-prose" dangerouslySetInnerHTML={{ __html: html }} /></div><div className="article-ending"><span aria-hidden="true">✳</span><p>A little island. An extraordinary spice.</p><Link href="/blog" className="text-link">More to discover <ArrowUpRight size={17} /></Link></div></article>{related.length > 0 && <section className="section related-stories"><p className="eyebrow">STAY A LITTLE LONGER</p><h2>Turn another page.</h2><div className="journal-grid">{related.map(a => <ArticleCard key={a.id} article={a} />)}</div></section>}</main>;
}
