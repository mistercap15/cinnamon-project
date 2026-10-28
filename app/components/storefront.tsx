'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { ArrowUpRight, Leaf, Menu, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { firstVariant, money, type Money, type Product, type Variant } from '../lib/types';

type BagLine = { id: string; handle: string; title: string; variant: string; image: string; price: Money; quantity: number; demo: boolean };
type BagContext = { add: (product: Product, variant?: Variant, quantity?: number) => void };
const Bag = createContext<BagContext | null>(null);
export function useBag() { const bag = useContext(Bag); if (!bag) throw new Error('Bag provider missing'); return bag; }
const navigation = [{ label: 'Our roots', href: '/#story' }, { label: 'Shop', href: '/shop' }, { label: 'Daily rituals', href: '/#rituals' }, { label: 'Journal', href: '/blog' }];

function readBag(value: string | null, live: boolean): BagLine[] {
  try {
    const data: unknown = JSON.parse(value || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter((line): line is BagLine => Boolean(line && typeof line.id === 'string' && typeof line.handle === 'string' && typeof line.title === 'string' && typeof line.variant === 'string' && typeof line.image === 'string' && typeof line.demo === 'boolean' && line.demo === !live && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99 && /^\d+(\.\d+)?$/.test(line.price?.amount) && /^[A-Z]{3}$/.test(line.price?.currencyCode))).slice(0, 50);
  } catch { return []; }
}

export function Storefront({ children, live }: { children: ReactNode; live: boolean }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false), [cart, setCart] = useState(false);
  const [lines, setLines] = useState<BagLine[]>([]), [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lenis = useRef<Lenis | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  const close = useCallback(() => { setMenu(false); setCart(false); }, []);
  const openCart = () => { opener.current = document.activeElement as HTMLElement; setError(''); setCart(true); };

  useEffect(() => { try { setLines(readBag(localStorage.getItem('ceylon-bag-v1'), live)); } catch { setLines([]); } setReady(true); }, [live]);
  useEffect(() => { if (ready) { try { localStorage.setItem('ceylon-bag-v1', JSON.stringify(lines)); } catch { /* Storage is optional in private browsing. */ } } }, [lines, ready]);
  useEffect(() => { const sync = (event: StorageEvent) => { if (event.key === 'ceylon-bag-v1') setLines(readBag(event.newValue, live)); }; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync); }, [live]);
  useEffect(() => { close(); }, [pathname, close]);

  useEffect(() => {
    document.documentElement.classList.add('js-ready');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const setup = () => { lenis.current?.destroy(); lenis.current = motion.matches ? null : new Lenis({ autoRaf: true, duration: .95, smoothWheel: true }); };
    setup(); motion.addEventListener('change', setup);
    const header = document.querySelector('header')!;
    const resize = new ResizeObserver(() => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`)); resize.observe(header);
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    const scroll = () => {
      const range = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty('--progress', `${range > 0 ? Math.min(100, Math.max(0, scrollY / range * 100)) : 0}%`);
      document.querySelector<HTMLElement>('.hero')?.style.setProperty('--offset', `${motion.matches ? 0 : Math.min(scrollY * .22, 190)}px`);
    };
    const navigate = (hash: string, immediate = false) => {
      let target: HTMLElement | null = null;
      try { target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch { return; }
      if (hash && !target) return;
      const top = target ? Math.max(0, scrollY + target.getBoundingClientRect().top + parseFloat(getComputedStyle(target).paddingTop || '0') - header.getBoundingClientRect().height - 28) : 0;
      const focus = () => { if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); } };
      if (lenis.current) { lenis.current.start(); lenis.current.scrollTo(top, { immediate, onComplete: focus }); }
      else { window.scrollTo({ top, behavior: 'instant' }); focus(); }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || (!url.hash && !link.getAttribute('href')?.endsWith('#'))) return;
      if (url.hash && !document.getElementById(decodeURIComponent(url.hash.slice(1)))) return;
      event.preventDefault(); close();
      requestAnimationFrame(() => requestAnimationFrame(() => { history.pushState(null, '', url.hash || '#'); navigate(url.hash); }));
    };
    const restore = () => requestAnimationFrame(() => requestAnimationFrame(() => navigate(location.hash, true)));
    document.addEventListener('click', click); window.addEventListener('hashchange', restore); window.addEventListener('scroll', scroll, { passive: true }); scroll();
    if (location.hash) restore();
    return () => { lenis.current?.destroy(); lenis.current = null; resize.disconnect(); observer.disconnect(); motion.removeEventListener('change', setup); document.removeEventListener('click', click); window.removeEventListener('hashchange', restore); window.removeEventListener('scroll', scroll); document.documentElement.classList.remove('js-ready'); };
  }, [pathname, close]);

  useEffect(() => {
    if (!menu && !cart) return;
    lenis.current?.stop();
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const background = document.querySelectorAll<HTMLElement>('header,#page-content,footer'); background.forEach(el => el.inert = true);
    const frame = requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>('button,a[href]')?.focus());
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key !== 'Tab') return;
      const targets = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)');
      if (!targets?.length) return;
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', keyboard); document.body.style.overflow = old; background.forEach(el => el.inert = false); lenis.current?.start(); if (opener.current?.isConnected) opener.current.focus({ preventScroll: true }); };
  }, [menu, cart, close]);

  const add = (product: Product, variant = firstVariant(product), quantity = 1) => {
    if (!variant?.availableForSale || !Number.isInteger(quantity) || quantity < 1) return;
    openCart();
    if (lines.length && lines[0].price.currencyCode !== variant.price.currencyCode) { setError('Please finish your current bag before changing currencies.'); return; }
    setLines(current => {
      const existing = current.find(line => line.id === variant.id);
      if (existing) return current.map(line => line.id === variant.id ? { ...line, price: variant.price, quantity: Math.min(99, line.quantity + quantity) } : line);
      return [...current, { id: variant.id, title: product.title, variant: variant.title, handle: product.handle, image: product.featuredImage?.url || '/images/hero.jpg', price: variant.price, quantity: Math.min(99, quantity), demo: product.demo }];
    });
  };
  const quantity = (id: string, delta: number) => { setError(''); setLines(current => current.map(line => line.id === id ? { ...line, quantity: Math.min(99, line.quantity + delta) } : line).filter(line => line.quantity > 0)); };
  const checkout = async () => {
    if (busy || !live || !lines.length) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: lines.map(line => ({ merchandiseId: line.id, quantity: line.quantity })) }) });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || 'Checkout is unavailable. Please try again.');
      window.location.assign(data.checkoutUrl);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.'); setBusy(false); }
  };

  return <Bag.Provider value={{ add }}>
    <div className="progress" /><a className="skip" href="#main-content">Skip to content</a>
    <header>
      <Link href="/" className="wordmark" aria-label="Ceylon home">ceylon<span>THE TRUE CINNAMON</span></Link>
      <nav aria-label="Main navigation">{navigation.map(item => item.href.includes('#') && pathname === '/' ? <a key={item.href} href={item.href.slice(1)}>{item.label}</a> : <Link key={item.href} href={item.href} aria-current={pathname === item.href || (item.href === '/shop' && pathname.startsWith('/products/')) || (item.href === '/blog' && pathname.startsWith('/blog/')) ? 'page' : undefined}>{item.label}</Link>)}</nav>
      <div className="nav-actions"><span className="origin">ROOTED IN SRI LANKA <span>✳</span></span><button className="bag" onClick={openCart} aria-label={`Open bag, ${total} items`}><ShoppingBag size={19} /><span>{total}</span></button><button className="mobile-toggle" aria-label="Open menu" aria-expanded={menu} onClick={() => { opener.current = document.activeElement as HTMLElement; setMenu(true); }}><Menu /></button></div>
    </header>
    <div id="page-content">{children}</div>
    <footer className="site-footer"><div className="footer-top"><Link className="wordmark" href="/">ceylon<span>THE TRUE CINNAMON</span></Link><p>A little island.<br /><em>An extraordinary spice.</em></p><div className="footer-links"><Link href="/shop">Shop the cinnamon <ArrowUpRight size={15} /></Link><Link href="/blog">Read the journal <ArrowUpRight size={15} /></Link><Link href="/#story">Discover our roots <ArrowUpRight size={15} /></Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} CEYLON{!live && ' · INDEPENDENT DESIGN CONCEPT'}</span><span>Crafted by Khilan Patel</span></div></footer>
    {menu && <div ref={dialog} className="mobile-menu" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Navigation"><button onClick={close} aria-label="Close menu"><X /></button><p className="eyebrow">A LITTLE ISLAND. PLENTY TO EXPLORE.</p>{navigation.map(item => item.href.includes('#') && pathname === '/' ? <a key={item.href} href={item.href.slice(1)}>{item.label}<ArrowUpRight /></a> : <Link key={item.href} href={item.href} onClick={close}>{item.label}<ArrowUpRight /></Link>)}</div>}
    {cart && <div className="cart-overlay" onClick={close}><div ref={dialog} className="cart-drawer" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Your bag" onClick={event => event.stopPropagation()}><div className="cart-header"><h2>Your little collection.</h2><button onClick={close} aria-label="Close bag"><X /></button></div><p className="demo-note">{live ? 'A little warmth, ready for your everyday.' : 'Preview bag · illustrative prices · checkout is not enabled.'}</p>{!total ? <div className="empty"><Leaf size={48} /><h3>A little wonder awaits.</h3><Link href="/shop" onClick={close} className="button dark">Explore the collection <ArrowUpRight /></Link></div> : <>
      {lines.map(line => <div className="cart-item" key={line.id}><Link href={`/products/${line.handle}`} onClick={close} aria-label={`View ${line.title}`}><img src={line.image} alt={line.title} /></Link><div><Link href={`/products/${line.handle}`} onClick={close}><h3>{line.title}</h3></Link><p>{money(line.price)} · {line.variant === 'Default Title' ? 'Original' : line.variant}</p><div className="quantity"><button disabled={busy} aria-label={`Remove one ${line.title}, ${line.variant}`} onClick={() => quantity(line.id, -1)}><Minus size={14} /></button><span aria-live="polite">{line.quantity}</span><button disabled={busy || line.quantity >= 99} aria-label={`Add one ${line.title}, ${line.variant}`} onClick={() => quantity(line.id, 1)}><Plus size={14} /></button></div></div></div>)}
      <div className="cart-total"><span>{live ? 'Estimated subtotal' : 'Illustrative subtotal'}</span><span>{money({ amount: String(lines.reduce((sum, line) => sum + Number(line.price.amount) * line.quantity, 0)), currencyCode: lines[0].price.currencyCode })}</span></div><p>{live ? 'Availability, final prices, shipping, and taxes are confirmed at checkout.' : 'This is a preview collection. No order or payment will be collected.'}</p><button className="button dark checkout-button" disabled={!live || busy} onClick={checkout}>{busy ? 'Opening secure checkout…' : live ? 'Continue to checkout' : 'Checkout available at launch'}<ArrowUpRight size={18} /></button><button className="continue-shopping" onClick={close}>Keep exploring</button>
    </>}{error && <p role="alert" className="form-error">{error}</p>}</div></div>}
  </Bag.Provider>;
}
