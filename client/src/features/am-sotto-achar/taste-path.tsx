import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from "react";
import { AMSOTTO_BITE_A_IMAGE, AMSOTTO_TASTES as T, bn, reducedMotion } from "./content";
import { TasteArt } from "./taste-icons";
const loadPlayer = () => import("./taste-icons-player");
const TasteIconPlayer = lazy(loadPlayer);

// "Path" (approved 2026-10-20): one bite in order, ১ → ২ → ৩. A mango ribbon draws through the three
// stops once the section is in view; the page scrolls normally (no pinning), and each stop leads with a
// picture and one big word so it reads without much reading. Each taste rests on a clay plate as a
// small Remotion loop that plays only while the section is on screen; the still drawing shows until
// then and for reduced motion.
const stagger = (i: number) => ({ "--i": i } as CSSProperties);

export function TastePath() {
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const start = () => { if (!reducedMotion()) void loadPlayer().then(() => { if (!cancelled) setReady(true); }); };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
    const io = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) ref.current?.classList.add("is-in");
    }, { threshold: 0.2 });
    io.observe(ref.current!);
    return () => { cancelled = true; window.removeEventListener("load", start); io.disconnect(); };
  }, []);

  return <section ref={ref} className="v1-sec tp" aria-labelledby="amsotto-taste-heading">
    <p className="v1-kicker">স্বাদটা চেখে দেখুন</p><h2 id="amsotto-taste-heading">একটা কামড়, তিনটে অনুভূতি</h2>
    <p className="tp-lede">মুখে দিলে স্বাদ বদলায় — এই ক্রমে।</p>
    <div className="tp-wrap">
      <svg className="tp-ribbon" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength={1} d="M200 0 C 200 60, 60 70, 60 140 C 60 230, 340 220, 340 320 C 340 410, 60 410, 60 500 C 60 560, 200 560, 200 600" vectorEffect="non-scaling-stroke" />
      </svg>
      <img className="tp-bowl tp-rv" style={stagger(0)} src={AMSOTTO_BITE_A_IMAGE} alt="বাটিতে আমসত্ত্ব আচার" width={900} height={750} loading="lazy" decoding="async" />
      <ol className="tp-stops">{T.map((t, i) => <li key={t.name} className="tp-stop tp-rv" data-side={i === 1 ? "right" : "left"} style={stagger(i * 3 + 2)}>
        <span className="tp-badge" aria-hidden="true"><span className="tp-icon">{ready ? <Suspense fallback={<TasteArt icon={t.icon} />}><TasteIconPlayer icon={t.icon} playing={visible} offset={i * 30} /></Suspense> : <TasteArt icon={t.icon} />}</span><b style={{ background: t.ink }}>{bn(i + 1)}</b></span>
        <div><small>{t.step}</small><span className="tp-word" style={{ color: t.ink }}>{t.name}</span><p>{t.line}</p></div>
      </li>)}</ol>
    </div>
  </section>;
}
