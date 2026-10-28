'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <main id="main-content" className="state-page"><span aria-hidden="true">✳</span><p className="eyebrow">A LITTLE PAUSE</p><h1>Good things<br /><em>take a moment.</em></h1><p>We couldn’t load this page just now. Please try again in a little while.</p><button className="button dark" onClick={reset}>Try again</button><Link href="/" className="text-link">Back to the island</Link></main>;
}
