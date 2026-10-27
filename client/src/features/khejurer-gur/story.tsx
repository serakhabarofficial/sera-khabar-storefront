import { useEffect, useRef, type MouseEvent } from "react";
import brandLogo from "@assets/sera-khabar-logo.webp";
import type { LandingPackOption } from "@/features/landing/order";
import { AL, BURSTS, END_STRIP, LINE_TIP, NAKSHI_STRIP, PILL_LOTUS, RECIPE_FLOOR, RECIPE_STICKERS, WHY_BLOOM, WHY_TIP } from "./alpona";
import { GUR_IMAGES, GUR_PHONE_LABEL, GUR_USES, GUR_WHY, taka, reducedMotion, type GurProductMeta } from "./content";

export type GurShelfItem = { meta: GurProductMeta; packs: LandingPackOption[]; compareAt: number };
type Props = { shelf: GurShelfItem[]; inMemo: Set<string>; onAdd: (slug: string, pack: LandingPackOption) => void; onOrderClick: (event: MouseEvent<HTMLAnchorElement>) => void };

const html = (markup: string) => ({ dangerouslySetInnerHTML: { __html: markup } });
const HERO_MANDALA = `<svg viewBox="-100 -100 200 200">${AL.lotus("#D98A6E")}</svg>`;
const BORDER = AL.border("#A63D24", 1200);

/** Scroll-drawn line through the three গুড়, with the lotus riding its tip. */
function useTimeline(box: React.RefObject<HTMLDivElement | null>, deps: unknown) {
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const svg = el.querySelector<SVGSVGElement>(".gf-path")!, line = el.querySelector<SVGPathElement>("#gfLine")!, tip = el.querySelector<SVGGElement>("#gfArrow")!;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".gf-ti"));
    if (!items.length) return;
    let L = 0, S: [number, number][] = [], at: number[] = [], frame = 0;
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const build = () => {
      const br = el.getBoundingClientRect(), W = br.width, H = br.height;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const C = items.map((it) => { const r = it.querySelector(".gf-orb")!.getBoundingClientRect(); return [r.left - br.left + r.width / 2, r.top - br.top + r.height / 2]; });
      const pts = [[W * 0.7, -20], ...C];
      let d = `M${pts[0][0]} ${pts[0][1]}`;
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1], b = pts[k], dy = b[1] - a[1], sa = a[0] < W / 2 ? -1 : 1, sb = b[0] < W / 2 ? -1 : 1, sw = W * 0.1;
        d += ` C${clamp(a[0] + sa * sw, 8, W - 8)} ${a[1] + dy * 0.55} ${clamp(b[0] + sb * sw, 8, W - 8)} ${b[1] - dy * 0.55} ${b[0]} ${b[1]}`;
      }
      line.setAttribute("d", d);
      L = line.getTotalLength();
      S = Array.from({ length: 241 }, (_, k) => [(L * k) / 240, line.getPointAtLength((L * k) / 240).y]);
      at = C.map((c) => (S.find((s) => s[1] >= c[1] - 4) ?? S[S.length - 1])[0]);
      line.style.strokeDasharray = `${L} ${L}`;
    };
    const scroll = () => {
      if (!L) return;
      const RM = reducedMotion(), y = innerHeight * 0.62 - el.getBoundingClientRect().top;
      let len = RM ? L : 0;
      if (!RM) for (const [l, sy] of S) { if (sy > y) break; len = l; }
      line.style.strokeDashoffset = String(L - len);
      const q = line.getPointAtLength(len), q0 = line.getPointAtLength(Math.max(0, len - 3));
      tip.setAttribute("transform", `translate(${q.x} ${q.y}) rotate(${(Math.atan2(q.y - q0.y, q.x - q0.x) * 180) / Math.PI})`);
      tip.style.opacity = len > 4 && len < L - 4 ? "1" : "0";
      el.classList.toggle("end", len >= L - 4);
      items.forEach((it, i) => it.classList.toggle("on", len >= at[i] - 30));
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scroll); };
    const ro = new ResizeObserver(() => { build(); scroll(); });
    ro.observe(el);
    addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [box, deps]);
}

/** Why-গুড়: a straight stem grows down the centre; each reason opens as it passes. */
function useVine(box: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = box.current!;
    const svg = el.querySelector<SVGSVGElement>(".vn-svg")!, stem = el.querySelector<SVGPathElement>(".stem")!, bud = el.querySelector<SVGGElement>(".vn-bud")!;
    const items = Array.from(el.querySelectorAll<HTMLElement>(".vn-it"));
    let L = 0, S: [number, number][] = [], at: number[] = [], frame = 0;
    const build = () => {
      const br = el.getBoundingClientRect(), W = br.width, H = br.height;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      stem.setAttribute("d", `M${W / 2} 0 V${H - 30}`);
      L = stem.getTotalLength();
      S = Array.from({ length: 201 }, (_, k) => [(L * k) / 200, stem.getPointAtLength((L * k) / 200).y]);
      stem.style.strokeDasharray = `${L} ${L}`;
      at = items.map((it) => { const r = it.querySelector(".vn-node")!.getBoundingClientRect(); return r.top - br.top + r.height / 2 - 40; });
    };
    const scroll = () => {
      if (!L) return;
      const RM = reducedMotion(), y = innerHeight * 0.66 - el.getBoundingClientRect().top;
      let len = RM ? L : 0;
      if (!RM) for (const [l, sy] of S) { if (sy > y) break; len = l; }
      stem.style.strokeDashoffset = String(L - len);
      const q = stem.getPointAtLength(len);
      bud.setAttribute("transform", `translate(${q.x} ${q.y})`);
      bud.style.opacity = len > 4 ? "1" : "0";
      items.forEach((it, i) => it.classList.toggle("on", RM || y >= at[i]));
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scroll); };
    const ro = new ResizeObserver(() => { build(); scroll(); });
    ro.observe(el);
    addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, [box]);
}

export function GurHero({ onOrderClick }: Pick<Props, "onOrderClick">) {
  return <section className="gf-hero" data-hero data-io>
    <img className="gf-logo" src={brandLogo} alt="সেরা খাবার" width={700} height={128} />
    <p className="gf-kick rv">রাজশাহীর গাছির হাতে · শীতের ভোরে</p>
    <h1 className="gf-word">
      <span className="gf-pre rv" style={{ "--d": "80ms" } as React.CSSProperties}>খেজুরের</span>
      <img className="gf-lett" src={GUR_IMAGES.lettering} alt="গুড়" width={1200} height={859} fetchPriority="high" />
      <svg className="gf-drop gf-fall" style={{ "--fall": "calc(min(330px,58vw) * .42 + 52px)" } as React.CSSProperties} viewBox="0 0 22 30" aria-hidden="true">
        <defs><radialGradient id="gfG" cx="38%" cy="58%" r="70%"><stop offset="0" stopColor="#f08a3a" /><stop offset=".55" stopColor="#b4531b" /><stop offset="1" stopColor="#6a2207" /></radialGradient></defs>
        <path d="M11 0 C11 0 1 13 1 19.5 A10 10 0 0 0 21 19.5 C21 13 11 0 11 0Z" fill="url(#gfG)" /><ellipse cx="7.4" cy="18" rx="2.2" ry="3.6" fill="#fff" opacity=".55" transform="rotate(18 7.4 18)" />
      </svg>
    </h1>
    <div className="gf-trio">
      <div className="al-mand" aria-hidden="true" {...html(HERO_MANDALA)} />
      <div className="gf-side l"><img src={GUR_IMAGES.bij} alt="কাচের বাটিতে বীজ গুড়" width={800} height={800} /></div>
      <div className="gf-bowl"><img src={GUR_IMAGES.jhola} alt="বাটিতে ঝোলা গুড়" width={800} height={800} /><i className="gf-ring" aria-hidden="true" /></div>
      <div className="gf-side r"><img src={GUR_IMAGES.patali} alt="পাটালি গুড়ের টুকরো" width={800} height={800} /></div>
    </div>
    <p className="gf-sub rv" style={{ "--d": "200ms" } as React.CSSProperties}>ঝোলা · বীজ · পাটালি — চিনি নেই, ভেজাল নেই</p>
    <a className="btn rv" style={{ "--d": "260ms" } as React.CSSProperties} href="#gur-order" onClick={onOrderClick}>এখনই অর্ডার করুন</a>
    <small>ক্যাশ অন ডেলিভারি · সারা দেশে ৳১০০</small>
    <div className="al-bd" aria-hidden="true" {...html(BORDER)} />
  </section>;
}

export function GurStory({ shelf, inMemo, onAdd }: Omit<Props, "onOrderClick">) {
  const timeline = useRef<HTMLDivElement>(null);
  const vine = useRef<HTMLDivElement>(null);
  useTimeline(timeline, shelf.map((s) => s.packs.length).join());
  useVine(vine);
  return <section className="gf-show" data-io aria-labelledby="gf-sh-h"><div className="al-bd top" aria-hidden="true" {...html(BORDER)} /><div>
    <div className="gf-shh">
      <div className="gf-mark"><b>গুড়</b><span>সেরা খাবার</span></div>
      <div className="gf-intro"><h2 id="gf-sh-h">শীতের তিন গুড়</h2><p>রাজশাহীর গাছির হাতে বানানো খেজুরের গুড়। এই শীতে আমাদের প্রিয় তিনটি: ঝোলা, বীজ আর পাটালি। যেকোনো দাম ছুঁলেই মেমোতে উঠবে।</p></div>
    </div>
    <div className="gf-tl" ref={timeline}>
      <svg className="gf-path" aria-hidden="true"><path id="gfLine" /><g id="gfArrow" {...html(LINE_TIP)} /></svg>
      <div className="gf-endbd" aria-hidden="true" {...html(END_STRIP)} />
      {shelf.map(({ meta, packs, compareAt }, i) => {
        const first = [...packs].sort((a, b) => a.unitPrice - b.unitPrice)[0];
        return <article key={meta.slug} className={`gf-ti${i % 2 ? " r" : ""}`}>
          <div className="gf-orb"><span className="gf-burst" aria-hidden="true"><svg viewBox="-100 -100 200 200" {...html(BURSTS[i])} /></span>
            <span className="gf-lbl" aria-hidden="true"><svg viewBox="0 0 200 200"><path id={`gfRp${i}`} d="M100 100 m-92 0 a92 92 0 1 1 184 0 a92 92 0 1 1 -184 0" fill="none" /><text><textPath href={`#gfRp${i}`} startOffset={`${meta.labelOffset}%`}>{meta.name} •</textPath></text></svg></span>
            <div className="gf-ph"><img src={meta.image} alt={meta.name} width={800} height={800} loading="lazy" style={{ "--z": meta.zoom } as React.CSSProperties} /></div></div>
          <div className="gf-tx">
            <h3 className="sr-only">{meta.name}</h3>
            <b className="num">{first ? taka(first.unitPrice) : "—"}</b><i>{first ? <b>{first.label} থেকে</b> : null}{first ? " · " : ""}{meta.line}</i>
            <div className="szs">{packs.map((pack) => {
              const cut = compareAt > pack.unitPrice && pack.unitPrice === first?.unitPrice ? compareAt : 0;
              return <button key={pack.variantId} type="button" className={`gf-pill${inMemo.has(pack.variantId) ? " added" : ""}`} aria-pressed={inMemo.has(pack.variantId)} aria-label={`${meta.name} ${pack.label} ${taka(pack.unitPrice)} মেমোতে যোগ করুন`} onClick={() => onAdd(meta.slug, pack)}>
                <span className="pt"><span><span className="num">{taka(pack.unitPrice)}</span>{cut ? <s className="num">{taka(cut)}</s> : null}</span><small>{pack.label}</small></span><span className="ds" aria-hidden="true" {...html(PILL_LOTUS)} />
              </button>;
            })}</div>
          </div>
        </article>;
      })}
    </div>
    <div className="gf-low">
      <div className="gf-about" data-io><h3>আমাদের কথা</h3><p>শীতের ভোরে গাছ থেকে নামানো রস, উঠোনের চুলায় ঘণ্টার পর ঘণ্টা জ্বাল। চিনি নেই, ভেজাল নেই। হাট থেকে সরাসরি আপনার রান্নাঘরে।</p><small>নওহাটা, রাজশাহী</small></div>
      <section className="gf-rc" data-io aria-labelledby="gf-rc-h">
        <div className="stripes" aria-hidden="true"><svg width="100%" height="100%" {...html(RECIPE_FLOOR)} /></div>
        <div className="rc-stack">
          <div className="rc-back" aria-hidden="true" />
          <article className="rc-card">
            <h3 id="gf-rc-h">সেরা খাবার</h3><span className="ad">নওহাটা, রাজশাহী · {GUR_PHONE_LABEL}</span>
            <div className="rc-dash" />
            <div className="rc-arts" aria-hidden="true">{[GUR_IMAGES.illJhola, GUR_IMAGES.illBij, GUR_IMAGES.illPatali].map((src) => <div key={src} className="rc-art"><img src={src} alt="" width={480} height={480} loading="lazy" /></div>)}</div>
            <span className="sc">গুড় দিয়ে কী করবেন</span>
            <ol className="rc-list">{GUR_USES.map((use, n) => <li key={use.icon} style={{ "--d": `${900 + n * 110}ms` } as React.CSSProperties}><span className="rc-stk" style={{ "--r": `${[-8, 6, -5, 7, -6, 5][n]}deg` } as React.CSSProperties} {...html(RECIPE_STICKERS[use.icon])} /><b>{use.title}</b><i /><span>{use.gur}</span></li>)}</ol>
            <div className="rc-dash" />
            <div className="rc-foot"><em>ধন্যবাদ</em><span>মোট: ৬ রকম স্বাদ</span></div>
            <div className="rc-dash" />
          </article>
          <div className="rc-post" aria-hidden="true"><div><small>রাজশাহী</small><img src={GUR_IMAGES.illPatali} alt="" width={480} height={480} loading="lazy" /><b>শীত ২০২৬</b></div></div>
        </div>
      </section>
      <section className="gf-ph2" data-io aria-labelledby="gf-ph-h">
        <div className="hd"><h3 id="gf-ph-h">চিনির বদলে গুড় কেন?</h3><p>একই মিষ্টি, কিন্তু খাঁটি রস থেকে, ধীরে জ্বাল দিয়ে বানানো।</p></div>
        <div className="vn" ref={vine}>
          <svg className="vn-svg" aria-hidden="true"><path className="stem" /><g className="vn-bud" {...html(WHY_TIP)} /></svg>
          {GUR_WHY.map((why, n) => <div key={why.title} className={`vn-it${n % 2 ? " r" : ""}`}>
            <div className="vn-node"><svg viewBox="-100 -100 200 200" aria-hidden="true" {...html(WHY_BLOOM)} /><div className="ph"><img src={why.image} alt="" width={560} height={512} loading="lazy" /></div></div>
            <div className="vn-tx"><b>{why.title}</b><span>{why.line}</span></div>
          </div>)}
        </div>
        <div className="vn-bd" aria-hidden="true" {...html(NAKSHI_STRIP)} />
      </section>
    </div>
  </div></section>;
}
