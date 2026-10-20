import { useEffect, useRef, type CSSProperties } from "react";
import { AMSOTTO_BITE_A_IMAGE, AMSOTTO_BITE_B_IMAGE, AMSOTTO_TASTES as T, reducedMotion } from "./content";
import { advanceTasteMotion, createTasteMotionState, tasteMotionVisuals, type TasteMotionState } from "./taste-motion";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const POS = [0.12, 0.5, 0.88];

export function TasteSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = ref.current!;
    const pin = track.querySelector<HTMLElement>(".tv-pin")!;
    const bowl = track.querySelector<HTMLElement>("[data-bowl]")!;
    const a = bowl.querySelector<HTMLImageElement>("[data-a]")!;
    const b = bowl.querySelector<HTMLElement>("[data-b]")!;
    const glow = track.querySelector<HTMLElement>("[data-glow]")!;
    const roll = track.querySelector<HTMLElement>("[data-roll]")!;
    const lines = Array.from(track.querySelectorAll<HTMLElement>("[data-line]"));
    const dots = Array.from(track.querySelectorAll<HTMLButtonElement>("[data-dot]"));
    const pinned = !reducedMotion();
    track.classList.toggle("pinned", pinned);
    // Centre the pinned card without a full-height wrapper, which left empty space after the section.
    const size = new ResizeObserver(() => track.style.setProperty("--pin-h", `${pin.offsetHeight}px`));
    size.observe(pin);
    // Fade the bowl in once decoded so a slow image never pops in mid-scroll.
    const reveal = () => { bowl.dataset.ready = "true"; };
    a.decode().then(reveal, reveal);
    let active = -1, enter = 1;
    const apply = (state: TasteMotionState) => {
      const p = state.progress;
      const { position: pos, swap, dip } = tasteMotionVisuals(state);
      // `enter` carries the bowl from below into place while the card scrolls in, so the
      // motion flows straight into the pinned spin instead of starting abruptly at the pin.
      const rest = 1 - enter;
      bowl.style.transform = `translate3d(0,${rest * 56}px,0) rotate(${-8 + 16 * p - 10 * rest}deg) scale(${(1 - 0.08 * dip) * (1 - 0.12 * rest)})`;
      a.style.opacity = String(1 - swap); a.style.transform = `rotate(${swap * 14}deg)`;
      b.style.opacity = String(swap); b.style.transform = `rotate(${(swap - 1) * 14}deg)`;
      glow.style.transform = `scale(${1 + 0.12 * dip})`;
      roll.style.transform = `translate3d(0,${-pos * 100 / 3}%,0)`;
      lines.forEach((line, i) => {
        const d = pos - i;
        line.style.opacity = String(clamp(1 - Math.abs(d) * 2));
        line.style.transform = `translate3d(0,${-d * 14}px,0)`;
      });
      const now = Math.round(pos);
      if (now === active) return;
      active = now;
      glow.style.backgroundColor = T[now].glow;
      dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === now)));
    };
    const pinRun = () => ({ top: parseFloat(getComputedStyle(pin).top) || 0, run: track.offsetHeight - pin.offsetHeight });
    const read = () => { const { top, run } = pinRun(); return run > 0 ? clamp((top - track.getBoundingClientRect().top) / run) : 0; };
    const readEnter = () => { const vh = window.innerHeight, top = pinRun().top; return clamp((vh - track.getBoundingClientRect().top) / Math.max(1, vh - top)); };
    const handlers = dots.map((dot, i) => {
      const handler = () => {
        if (!pinned) { apply(createTasteMotionState(POS[i])); return; }
        const { top, run } = pinRun();
        window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().top - top + run * POS[i], behavior: "smooth" });
      };
      dot.addEventListener("click", handler);
      return () => dot.removeEventListener("click", handler);
    });
    let state = createTasteMotionState(pinned ? read() : POS[0]);
    if (pinned) enter = readEnter();
    let raf = 0, last = 0, live = false;
    const tick = (now: number) => {
      const target = read(), dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const next = advanceTasteMotion(state, target, dt);
      const goal = readEnter(), prevEnter = enter;
      enter = Math.abs(goal - enter) < 1e-4 ? goal : enter + (goal - enter) * (1 - Math.exp(-dt / 80));
      if (enter !== prevEnter || next.progress !== state.progress || next.first !== state.first || next.second !== state.second) apply(next);
      state = next;
      raf = live ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      live = entry.isIntersecting;
      if (live && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    }, { rootMargin: "200px 0px" });
    if (pinned) io.observe(track);
    apply(state);
    return () => { live = false; io.disconnect(); size.disconnect(); cancelAnimationFrame(raf); handlers.forEach((off) => off()); };
  }, []);

  return <div ref={ref} className="tv-track tvs" data-taste-sec>
    <div className="tv-pin"><section className="tv-card" aria-labelledby="amsotto-taste-heading">
      <p className="v1-kicker">স্বাদটা চেখে দেখুন</p><h2 id="amsotto-taste-heading">একটা কামড়, তিনটে অনুভূতি</h2>
      <div className="tvs-stage"><span className="tvs-glow" data-glow /><div className="tvs-bowl" data-bowl aria-hidden="true"><img src={AMSOTTO_BITE_A_IMAGE} alt="" data-a fetchPriority="low" /><img src={AMSOTTO_BITE_B_IMAGE} alt="" data-b style={{ opacity: 0 }} fetchPriority="low" /></div></div>
      <div className="tvs-roll" aria-hidden="true"><div data-roll>{T.map((t) => <span key={t.name} style={{ color: t.ink }}>{t.name}</span>)}</div></div>
      <div className="tvs-lines" aria-hidden="true">{T.map((t) => <p key={t.name} data-line><b style={{ color: t.ink }}>{t.title}।</b> {t.line}</p>)}</div>
      <div className="tvs-dots">{T.map((t) => <button key={t.name} type="button" data-dot aria-label={t.name} style={{ "--ink": t.ink } as CSSProperties} />)}</div>
      <ul className="tv-sr">{T.map((t) => <li key={t.name}>{t.step}: {t.title}। {t.line}</li>)}</ul>
    </section></div>
  </div>;
}
