'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowUpRight, Leaf, Pause, Play } from 'lucide-react';

const motes = [
  [53, 18, 19, -7], [67, 69, 24, -13], [87, 34, 21, -4],
  [74, 47, 27, -18], [42, 76, 23, -11], [92, 79, 25, -6],
  [61, 39, 20, -16], [80, 17, 28, -22], [48, 54, 26, -9],
];

export function CinematicHero() {
  const hero = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    const visibility = () => setTabVisible(!document.hidden);
    update(); visibility();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', visibility);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (hero.current) observer.observe(hero.current);
    return () => { preference.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const element = hero.current;
    if (!element || reduced || paused || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0, x = 0, y = 0;
    const move = (event: PointerEvent) => {
      const bounds = element.getBoundingClientRect();
      x = (event.clientX - bounds.left - bounds.width / 2) / bounds.width * 12;
      y = (event.clientY - bounds.top - bounds.height / 2) / bounds.height * 8;
      if (!frame) frame = requestAnimationFrame(() => { element.style.setProperty('--pointer-x', `${x}px`); element.style.setProperty('--pointer-y', `${y}px`); frame = 0; });
    };
    const reset = () => { cancelAnimationFrame(frame); frame = 0; element.style.setProperty('--pointer-x', '0px'); element.style.setProperty('--pointer-y', '0px'); };
    element.addEventListener('pointermove', move, { passive: true }); element.addEventListener('pointerleave', reset);
    return () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', reset); reset(); };
  }, [reduced, paused]);

  return <section className="hero cinematic-hero" ref={hero} data-motion={paused || reduced || !inView || !tabVisible ? 'paused' : 'running'} aria-label="A little island, an extraordinary spice">
    <div className="hero-visual" aria-hidden="true"><div className="hero-scene"><img className="hero-film" src="/images/hero.jpg" alt="" fetchPriority="high" loading="eager" /><div className="hero-light" /></div></div>
    <div className="hero-shade" aria-hidden="true" />
    <div className="hero-motes" aria-hidden="true">{motes.map(([left, top, duration, delay], i) => <i key={i} style={{ left: `${left}%`, top: `${top}%`, '--drift-time': `${duration}s`, '--drift-delay': `${delay}s` } as CSSProperties} />)}</div>
    <div className="hero-top"><span>ONE ISLAND. A WORLD OF WONDER.</span><span>06° N / 80° E</span></div>
    <div className="hero-copy"><p className="eyebrow light">NATURE’S QUIET MASTERPIECE</p><h1><span className="hero-line"><span>A little island.</span></span><span className="hero-line"><span>An <em>extraordinary</em></span></span><span className="hero-line"><span>spice.</span></span></h1><p>Born in the heart of Sri Lanka.<br />Made for the moments worth savouring.</p><div className="hero-actions"><a className="button cream" href="#collection">Discover true cinnamon <ArrowUpRight size={19} /></a><a className="hero-secondary" href="#story">Meet our roots <ArrowUpRight size={16} /></a></div><p className="hero-product-note">WHOLE QUILLS & FINELY GROUND · CEYLON CINNAMON</p></div>
    <div className="floating-note"><Leaf size={23} /><span>Cinnamomum verum<br /><i>Nothing quite like the real thing.</i></span></div>
    <div className="hero-bottom"><a href="#story"><span className="circle"><ArrowDown size={18} /></span><span>A STORY WORTH SLOWING DOWN FOR</span></a>{!reduced && <button className="hero-motion-control" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Play background motion' : 'Pause background motion'}>{paused ? <Play size={12} /> : <Pause size={12} />}<span>{paused ? 'Play motion' : 'Pause motion'}</span></button>}</div>
  </section>;
}
