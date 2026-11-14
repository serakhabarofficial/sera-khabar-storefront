import { useEffect, useRef, useState, type MouseEvent } from "react";
import brandLogo from "@assets/sera-khabar-logo.webp";
import type { LandingPackOption } from "@/features/landing/order";
import { AL, JHALOR, JHALOR_BG, PILL_LOTUS, RECIPE_FLOOR, RECIPE_STICKERS, WHY_BLOOM, WHY_MINERALS, WHY_SWEET, WHY_TIP } from "./alpona";
import { banglaDateParts } from "./bangla-date";
import { GUR_IMAGES, GUR_PHONE_LABEL, GUR_USES, GUR_VARIETIES, GUR_WHY, bn, taka, reducedMotion, type GurProductMeta } from "./content";

export type GurShelfItem = { meta: GurProductMeta; packs: LandingPackOption[] };
type Props = { shelf: GurShelfItem[]; inMemo: Set<string>; onAdd: (slug: string, pack: LandingPackOption) => void; onOrderClick: (event: MouseEvent<HTMLAnchorElement>) => void; title: string; line: string };

const html = (markup: string) => ({ dangerouslySetInnerHTML: { __html: markup } });
const HERO_MANDALA = `<svg viewBox="-100 -100 200 200">${AL.lotus("#D98A6E")}</svg>`;

/** Counts a price up from ৳০ the first time it shows, then rolls between products and sizes. */
function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (reducedMotion()) { from.current = value; setShown(value); return; }
    const start = from.current, t0 = performance.now();
    let frame = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 650), v = Math.round(start + (value - start) * (1 - (1 - k) ** 3));
      from.current = v; setShown(v);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{taka(shown)}</>;
}

const DIAL_STEP = 24; // degrees between two গুড় on the arc
const DIAL_MS = 2000; // how long each গুড় rests while the arc fills to the next one
const two = (i: number) => bn(String(i + 1).padStart(2, "0"));

/**
 * কাঁটা: numbers ride a thin arc on the left; the গুড় at the pointer shows on the right with its photo, big
 * number, price and the cart button. The section scrolls normally (no pinning): a stroke fills along the arc from
 * the current গুড় to the next, then the dial turns. Tapping a number jumps to it; tapping a number, a size or the
 * cart stops the autoplay. It pauses off screen and while touched or hovered, and never autoplays for reduced motion.
 */
function GurDial({ shelf, inMemo, onAdd, title }: Omit<Props, "onOrderClick" | "line">) {
  const deck = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [stopped, setStopped] = useState(false);
  const jump = useRef<(i: number) => void>(() => {});
  const wake = useRef<() => void>(() => {});
  const play = useRef({ visible: false, held: false, stopped: false });
  const n = shelf.length;
  const stop = () => { play.current.stopped = true; setStopped(true); wake.current(); };
  useEffect(() => {
    const el = deck.current;
    if (!el || !n) return;
    if (reducedMotion()) stop();
    const stage = el.querySelector<HTMLElement>(".gf-stage")!, ring = stage.querySelector<HTMLElement>(".gf-arc")!;
    const prog = stage.querySelector<SVGSVGElement>(".gf-prog")!, bar = prog.querySelector<SVGCircleElement>("circle")!;
    const ticks = Array.from(stage.querySelectorAll<HTMLElement>(".gf-tick")), nums = Array.from(stage.querySelectorAll<HTMLElement>(".gf-num"));
    const shots = Array.from(stage.querySelectorAll<HTMLElement>(".gf-shot img"));
    let R = 0, CX = 0, CY = 0, pos = 0, target = 0, frame = 0, last = -1, held = 0, prev = 0, shownK = -1;
    const layout = () => {
      const W = stage.clientWidth, H = stage.clientHeight, wide = W >= 760;
      R = Math.min(H * 0.42, wide ? 420 : 330);
      CX = -R + (wide ? Math.min(W * 0.34, 460) : Math.min(W * 0.27, 130));
      CY = H * 0.47;
      const box = { left: `${CX - R}px`, top: `${CY - R}px`, width: `${R * 2}px`, height: `${R * 2}px` };
      Object.assign(ring.style, box); Object.assign(prog.style, box);
      prog.setAttribute("viewBox", `0 0 ${R * 2} ${R * 2}`);
      bar.setAttribute("cx", `${R}`); bar.setAttribute("cy", `${R}`); bar.setAttribute("r", `${R}`);
      stage.style.setProperty("--info-x", `${Math.round(CX + R + (wide ? 64 : 22))}px`);
    };
    // positions only change while the dial turns, and only through transform/opacity (no layout work)
    const paintDial = () => {
      for (let i = 0; i < n; i++) {
        const d = i - pos, a = (d * DIAL_STEP * Math.PI) / 180, nr = R - 50;
        ticks[i].style.transform = `translate(${(CX + R * Math.cos(a)).toFixed(1)}px, ${(CY + R * Math.sin(a)).toFixed(1)}px)`;
        ticks[i].classList.toggle("on", Math.abs(d) < 0.5);
        nums[i].style.transform = `translate(${(CX + nr * Math.cos(a)).toFixed(1)}px, ${(CY + nr * Math.sin(a)).toFixed(1)}px) translate(-50%, -50%) rotate(${(d * DIAL_STEP).toFixed(2)}deg)`;
        nums[i].style.opacity = Math.abs(d) > 3.2 ? "0" : Math.min(1, Math.abs(d)).toFixed(3);
        const vis = Math.max(0, 1 - Math.abs(d) * 1.8);
        shots[i].style.opacity = vis.toFixed(3);
        shots[i].style.transform = `translateY(${(d * 40).toFixed(1)}px) rotate(${(d * 18).toFixed(2)}deg) scale(${(0.9 + vis * 0.1).toFixed(3)})`;
      }
      const now = Math.round(pos);
      if (now !== last) { last = now; setActive(now); }
    };
    // the progress stroke runs clockwise from the pointer (3 o'clock) down to the next গুড়'s dot
    const paintBar = () => {
      const k = play.current.stopped || target !== pos ? 0 : Math.min(1, held / DIAL_MS);
      if (Math.abs(k - shownK) < 0.002) return;
      shownK = k;
      const seg = (2 * Math.PI * R * DIAL_STEP) / 360;
      bar.style.strokeDasharray = `${(seg * k).toFixed(2)} ${(2 * Math.PI * R).toFixed(2)}`;
    };
    const autoplaying = () => { const p = play.current; return !p.stopped && p.visible && !p.held; };
    const tick = (t: number) => {
      frame = 0;
      const dt = prev ? Math.min(100, t - prev) : 0;
      prev = t;
      if (target !== pos) {
        pos += (target - pos) * (reducedMotion() ? 1 : 0.12);
        if (Math.abs(target - pos) < 0.001) pos = target;
        paintDial();
      } else if (autoplaying()) {
        held += dt;
        if (held >= DIAL_MS) { held = 0; target = (target + 1) % n; }
      }
      paintBar();
      // keep the loop alive only while something is moving; otherwise it sleeps until woken
      if (target !== pos || autoplaying()) frame = requestAnimationFrame(tick);
      else prev = 0;
    };
    wake.current = () => { if (!frame) { prev = 0; frame = requestAnimationFrame(tick); } };
    jump.current = (i: number) => { held = 0; target = i; wake.current(); };
    const io = new IntersectionObserver(([e]) => { play.current.visible = e.isIntersecting; if (e.isIntersecting) wake.current(); }, { threshold: 0.35 });
    io.observe(stage);
    const ro = new ResizeObserver(() => { layout(); paintDial(); shownK = -1; paintBar(); });
    ro.observe(stage);
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(frame); wake.current = () => {}; };
  }, [n]);
  const item = shelf[Math.min(active, n - 1)];
  if (!item) return null;
  const { meta, packs } = item;
  const pack = packs.find((p) => p.variantId === chosen[meta.slug]) ?? packs[0];
  const added = pack ? inMemo.has(pack.variantId) : false;
  const hold = (on: boolean) => () => { play.current.held = on; if (!on) wake.current(); };
  return <div ref={deck} className={`gf-dial${stopped ? " stopped" : ""}`} role="region" aria-roledescription="carousel" aria-label={title}>
    <div className="gf-stage" onPointerEnter={(e) => { if (e.pointerType === "mouse") play.current.held = true; }} onPointerLeave={hold(false)}
      onTouchStart={hold(true)} onTouchEnd={hold(false)} onTouchCancel={hold(false)} onFocus={hold(true)} onBlur={hold(false)}>
      <span className="gf-arc" aria-hidden="true" />
      <svg className="gf-prog" aria-hidden="true"><circle /></svg>
      {shelf.map(({ meta: m }) => <span key={m.slug} className="gf-tick" aria-hidden="true" />)}
      {shelf.map(({ meta: m }, i) => <button key={m.slug} type="button" className="gf-num num" aria-label={m.name} aria-current={i === active} onClick={() => { stop(); jump.current(i); }}>{two(i)}</button>)}
      <div className="gf-info">
        <div className="gf-shot" aria-hidden="true">{shelf.map(({ meta: m }) => <img key={m.slug} src={m.image} alt="" width={800} height={800} loading="lazy" decoding="async" style={{ "--z": m.zoom } as React.CSSProperties} />)}</div>
        <div key={meta.slug} className="gf-swap" aria-live={stopped ? "polite" : "off"}>
          <span className="gf-big num" aria-hidden="true">{two(active)}</span>
          <h3>{meta.name}</h3>
          <p>{meta.line}</p>
        </div>
        {pack && <>
          <div className="gf-price"><b className="num"><CountUp value={pack.unitPrice} /></b><small>{pack.label}</small></div>
          {packs.length > 1 && <div className="gf-seg" role="radiogroup" aria-label={`${meta.name}-এর মাপ`}>
            {packs.map((p) => <button key={p.variantId} type="button" role="radio" aria-checked={p.variantId === pack.variantId} className={p.variantId === pack.variantId ? "on" : ""} onClick={() => { stop(); setChosen((c) => ({ ...c, [meta.slug]: p.variantId })); }}>{p.label}<span className="num">{taka(p.unitPrice)}</span></button>)}
          </div>}
          <button type="button" className={`gf-pill gf-add${added ? " added" : ""}`} aria-pressed={added} aria-label={`${meta.name} ${pack.label} ${taka(pack.unitPrice)} কার্টে যোগ করুন`} onClick={() => { stop(); onAdd(meta.slug, pack); }}>
            <span className="pt">{added ? "কার্টে আছে" : "কার্টে যোগ করুন"}</span><span className="ds" aria-hidden="true" {...html(PILL_LOTUS)} />
          </button>
        </>}
      </div>
    </div>
  </div>;
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

/** The hero's sub line: a small box that cycles through every গুড় by name; the box keeps the widest name's width so the line never shifts. */
const GUR_NAMES = GUR_VARIETIES.map((p) => p.name);
function GurNameTicker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % GUR_NAMES.length), 1900);
    return () => window.clearInterval(t);
  }, []);
  const prev = (i + GUR_NAMES.length - 1) % GUR_NAMES.length;
  return <><span className="gf-tk" aria-hidden="true">{GUR_NAMES.map((name, k) => <span key={name} className={k === i ? "on" : k === prev ? "out" : ""}>{name}</span>)}</span><span className="sr-only">{GUR_NAMES.join(", ")}</span></>;
}

export function GurHero({ onOrderClick, note }: Pick<Props, "onOrderClick"> & { note: string }) {
  return <section className="gf-hero" data-hero data-io>
    <img className="gf-logo" src={brandLogo} alt="সেরা খাবার" width={700} height={128} />
    <h1 className="gf-word">
      <span className="gf-pre rv" style={{ "--d": "80ms" } as React.CSSProperties}><img className="gf-pre-lett" src={GUR_IMAGES.khejurerLettering} alt="খেজুরের" width={720} height={348} fetchPriority="high" /></span>
      <span className="gf-lw">
      <img className="gf-lett" src={GUR_IMAGES.lettering} alt="গুড়" width={1200} height={859} fetchPriority="high" />
      <svg className="gf-drop gf-fall" viewBox="0 0 22 30" aria-hidden="true">
        <defs><radialGradient id="gfG" cx="38%" cy="58%" r="70%"><stop offset="0" stopColor="#f08a3a" /><stop offset=".55" stopColor="#b4531b" /><stop offset="1" stopColor="#6a2207" /></radialGradient></defs>
        <path d="M11 0 C11 0 1 13 1 19.5 A10 10 0 0 0 21 19.5 C21 13 11 0 11 0Z" fill="url(#gfG)" /><ellipse cx="7.4" cy="18" rx="2.2" ry="3.6" fill="#fff" opacity=".55" transform="rotate(18 7.4 18)" />
      </svg>
      </span>
    </h1>
    <div className="gf-trio">
      <div className="al-mand" aria-hidden="true" {...html(HERO_MANDALA)} />
      <div className="gf-bowl gf-pour"><video src={GUR_IMAGES.heroPour} poster={GUR_IMAGES.heroPourPoster} width={960} height={640} autoPlay muted loop playsInline preload="auto" aria-label="পিঠার উপর ঝোলা গুড় ঢালা হচ্ছে" /></div>
    </div>
    <p className="gf-sub rv" style={{ "--d": "200ms" } as React.CSSProperties}><GurNameTicker /> — চিনি নেই, ভেজাল নেই</p>
    <a className="btn rv" style={{ "--d": "260ms" } as React.CSSProperties} href="#gur-order" onClick={onOrderClick}>এখনই অর্ডার করুন</a>
    <small>{note}</small>
  </section>;
}

const WHY_ICONS = { minerals: WHY_MINERALS, sweet: WHY_SWEET };
const QUOTE = "কুয়াশার কোলে শিশিরের গান, খেজুরের গুড়ে বাংলার প্রাণ";

// The verse under the hero, as a মোহিনী-style কার্তুশ on the burgundy lotus pattern: pink stepped frame,
// lotuses in the corners and today's বঙ্গাব্দ date are already in place; only the hand-lettered verse rises in on scroll.
export function GurQuote() {
  // Today's বঙ্গাব্দ date; rechecked every minute so an open page turns over at midnight in Dhaka.
  const [today, setToday] = useState(() => banglaDateParts());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(banglaDateParts()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  // রাজশাহীর ঐতিহ্য: a Puthia-temple terracotta frieze (গাছি, a woman with a রসের হাঁড়ি, a boat on the Padma, lotus, mangoes);
  // the verse and today's date sit on the cream above it. Fully static: no scroll reveal, nothing moves.
  return <section className="gf-q">
    <div className="q-in">
      <img className="q-art" src={GUR_IMAGES.quoteFrieze} srcSet={`${GUR_IMAGES.quoteFrieze} 800w, ${GUR_IMAGES.quoteFriezeLarge} 1200w`} sizes="(min-width: 601px) 760px, 100vw"
        alt="পুঠিয়ার মন্দিরের ধাঁচে পোড়ামাটির ফলক: খেজুর গাছে গাছি, মাথায় রসের হাঁড়ি নিয়ে নারী, পদ্মায় নৌকা, পদ্ম আর আম" width={1200} height={600} fetchPriority="high" />
      <blockquote>
        <img className="q-verse" src={GUR_IMAGES.quoteLettering} alt={QUOTE} width={1200} height={442} fetchPriority="high" />
        <span className="q-date">{today.month} {today.day} · {today.year}</span>
      </blockquote>
    </div>
  </section>;
}

/** রসের পথ (আঁকাবাঁকা পথ): the clips alternate sides as soft round vignettes, captions beneath; a dirt road winds down
 *  through the open space beside each one. A small গাছি walks the road as you scroll (nothing pins), stepping through a
 *  drawn walk cycle as he goes and standing still when you stop; when he reaches a
 *  stop its milestone lights and the line shows. */
const ROAD_STOPS = [
  { time: "ভোর ৪টা", line: "গাছে ওঠা", src: GUR_IMAGES.gachiFog, poster: GUR_IMAGES.gachiFogPoster, w: 640, h: 806, pos: "50% 38%", label: "কুয়াশার ভোরে খেজুর গাছে উঠছেন গাছি" },
  { time: "ভোর ৬টা", line: "রস নিয়ে পথে", src: GUR_IMAGES.roadWalk, poster: GUR_IMAGES.roadWalkPoster, w: 640, h: 640, pos: "50% 60%", label: "বাঁকে রসের হাঁড়ি নিয়ে কুয়াশার পথে হাঁটছেন গাছি" },
  { time: "সকাল ৮টা", line: "উঠোনের চুলায় জ্বাল", src: GUR_IMAGES.roadCook, poster: GUR_IMAGES.roadCookPoster, w: 640, h: 800, pos: "50% 55%", label: "চুলায় জ্বাল দেওয়া গুড় হাতা দিয়ে ঢালা হচ্ছে" },
] as const;

function GurRoad() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current!;
    const svg = el.querySelector<SVGSVGElement>(".gr-svg")!, walker = el.querySelector<HTMLElement>(".gr-walker")!;
    const strips = Array.from(svg.querySelectorAll<SVGPathElement>(".gr-p"));
    const stones = Array.from(svg.querySelectorAll<SVGCircleElement>(".gr-stone"));
    const stops = Array.from(el.querySelectorAll<HTMLElement>(".gr-stop"));
    const RM = reducedMotion();
    // Layout is measured once (and on resize), never during scroll. The road runs through the free side of each stop and
    // swings across between them; the walker follows it by looking up precomputed points, so scrolling never measures.
    let H = 0, top = 0, vh = innerHeight, vw = innerWidth, at: number[] = [], frame = 0, cur = -1, goal = 0;
    let px: number[] = [], py: number[] = [];
    // walk cycle: one frame per STRIDE px of road travelled (frames 1–4), the standing frame (0) once he stops
    const STRIDE = 13;
    let travelled = 0, lastX = 0, lastY = 0, frameShown = -1;
    const show = (f: number) => { if (f !== frameShown) { frameShown = f; walker.style.backgroundPosition = `${f * 25}% 0`; } };
    const build = () => {
      const br = el.getBoundingClientRect(), W = br.width;
      H = br.height; top = br.top + scrollY;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const pts = stops.map((st) => {
        const pic = st.querySelector<HTMLElement>(".gr-pic")!.getBoundingClientRect(), left = st.classList.contains("l");
        const near = left ? pic.right - br.left : pic.left - br.left;
        return { x: left ? (near + W) / 2 : near / 2, y: pic.top - br.top + pic.height / 2 };
      });
      let d = `M${pts[0].x.toFixed(1)} 0`, prev = { x: pts[0].x, y: 0 };
      for (const p of [...pts, { x: pts[pts.length - 1].x, y: H }]) {
        const k = (p.y - prev.y) * 0.55;
        d += ` C${prev.x.toFixed(1)} ${(prev.y + k).toFixed(1)} ${p.x.toFixed(1)} ${(p.y - k).toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        prev = p;
      }
      strips.forEach((s) => s.setAttribute("d", d));
      const len = strips[0].getTotalLength(), N = 180;
      px = []; py = [];
      for (let i = 0; i <= N; i++) { const q = strips[0].getPointAtLength((len * i) / N); px.push(q.x); py.push(q.y); }
      at = pts.map((p) => p.y);
      stones.forEach((c, i) => { c.setAttribute("cx", `${pts[i].x}`); c.setAttribute("cy", `${pts[i].y}`); });
    };
    // a stop lights once and stays lit, so scrolling back up never flickers or replays it
    const light = (y: number) => stops.forEach((st, i) => {
      if (st.classList.contains("on") || y < at[i] - 4) return;
      st.classList.add("on"); stones[i].classList.add("on");
    });
    // the road only ever runs downward, so the point at height y is found by search + interpolation over the samples
    const xAt = (y: number) => {
      if (!py.length) return 0;
      let lo = 0, hi = py.length - 1;
      if (y <= py[0]) return px[0];
      if (y >= py[hi]) return px[hi];
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (py[mid] <= y) lo = mid; else hi = mid; }
      const t = (y - py[lo]) / Math.max(py[hi] - py[lo], 0.001);
      return px[lo] + (px[hi] - px[lo]) * t;
    };
    const draw = (y: number, moving: boolean) => {
      const x = xAt(y);
      travelled += Math.hypot(x - lastX, y - lastY); lastX = x; lastY = y;
      const f = moving && !RM ? 1 + (Math.floor(travelled / STRIDE) % 4) : 0;
      show(f);
      const bob = f === 2 || f === 4 ? -1.5 : 0; // the passing steps ride a touch higher, like a real gait
      walker.style.transform = `translate3d(${x.toFixed(1)}px, ${(y + bob).toFixed(1)}px, 0) translate(-50%, -86%)`;
    };
    const target = () => RM ? H : Math.max(0, Math.min(H, scrollY + vh * 0.6 - top));
    const step = () => {
      frame = 0;
      const d = goal - cur;
      cur = Math.abs(d) < 0.4 ? goal : cur + d * 0.22;
      const still = cur === goal;
      draw(cur, !still); light(cur);
      if (!still) frame = requestAnimationFrame(step);
    };
    const onScroll = () => { goal = target(); if (!frame) frame = requestAnimationFrame(step); };
    const relayout = () => { build(); goal = target(); if (cur < 0) { cur = goal; lastX = xAt(cur); lastY = cur; } draw(cur, false); onScroll(); };
    // the phone's address bar changes innerHeight while scrolling; only a real resize (width change) remeasures the viewport
    const onResize = () => { if (innerWidth !== vw) { vw = innerWidth; vh = innerHeight; } relayout(); };
    const ro = new ResizeObserver(relayout);
    ro.observe(el); ro.observe(document.body);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    return () => { ro.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", onResize); cancelAnimationFrame(frame); };
  }, []);
  return <div className="gr" ref={box}>
    <svg className="gr-svg" aria-hidden="true">
      <defs>
        <linearGradient id="grFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".05" stopColor="#fff" /><stop offset=".95" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <mask id="grMask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" fill="url(#grFade)" /></mask>
      </defs>
      <g mask="url(#grMask)">
        <path className="gr-p grass" />
        <path className="gr-p dirt" />
        <path className="gr-p rut" />
      </g>
      {ROAD_STOPS.map((st) => <circle key={st.time} className="gr-stone" r="7" />)}
    </svg>
    {ROAD_STOPS.map((st, i) => <figure key={st.time} className={`gr-stop ${i % 2 ? "r" : "l"}`}>
      <div className="gr-pic">
        <video src={st.src} poster={st.poster} width={st.w} height={st.h} muted loop playsInline preload="none" aria-label={st.label} style={{ objectPosition: st.pos }}
          onPlaying={(e) => e.currentTarget.parentElement?.closest(".gr-stop")?.setAttribute("data-live", "")} />
        {/* the poster as a real image over the clip until the clip is actually playing: iOS Safari blanks a video's own poster the
            moment play() is called, before any frame is ready, which flashed the stop empty while scrolling. Frame 0 is the poster. */}
        <img className="gr-cover" src={st.poster} width={st.w} height={st.h} alt="" decoding="async" style={{ objectPosition: st.pos }} />
      </div>
      <figcaption><span>{st.time}</span><b>{st.line}</b></figcaption>
    </figure>)}
    <span className="gr-walker" aria-hidden="true" style={{ backgroundImage: `url(${GUR_IMAGES.roadWalkerCycle})` }} />
  </div>;
}

export function GurStory({ shelf, inMemo, onAdd, title, line }: Omit<Props, "onOrderClick">) {
  const vine = useRef<HTMLDivElement>(null);
  useVine(vine);
  // The band, header and road ease in once as the section's top reaches the screen, instead of popping in when iPhone
  // finishes painting them. Fires once; scrolling back never replays it.
  const show = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = show.current!;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { el.setAttribute("data-shown", ""); io.disconnect(); } }, { rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <section ref={show} className="gf-show" data-io aria-labelledby="gf-sh-h"><div className="al-bd top" aria-hidden="true" style={{ backgroundImage: JHALOR_BG }} /><div>
    <div className="gf-shh">
      <div className="gf-mark"><b>গুড়</b><span className="gf-mark-sub" aria-label="রসের পথ"><span aria-hidden="true">রসের</span><span aria-hidden="true">পথ</span></span></div>
    </div>
    <GurRoad />
    <div className="gr-end"><h2 id="gf-sh-h">{title}</h2><p>{line}</p></div>
    <GurDial shelf={shelf} inMemo={inMemo} onAdd={onAdd} title={title} />
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
            <div className="vn-node"><svg viewBox="-100 -100 200 200" aria-hidden="true" {...html(WHY_BLOOM)} />{"icon" in why ? <div className="ph ic"><svg viewBox="12 12 76 76" aria-hidden="true" {...html(WHY_ICONS[why.icon])} /></div> : <div className="ph"><img src={why.image} alt="" width={560} height={512} loading="lazy" /></div>}</div>
            <div className="vn-tx"><b>{why.title}</b><span>{why.line}</span></div>
          </div>)}
        </div>
        <div className="vn-bd" aria-hidden="true" {...html(JHALOR)} />
      </section>
    </div>
  </div></section>;
}
