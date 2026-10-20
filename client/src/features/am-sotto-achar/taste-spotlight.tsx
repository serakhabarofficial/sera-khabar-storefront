import { useEffect, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { AMSOTTO_BITE_A_IMAGE, AMSOTTO_BITE_B_IMAGE, AMSOTTO_TASTES as T, reducedMotion } from "./content";

// "Gentle" (approved 2026-10-20): the pinned card is driven by the browser's scroll timeline in CSS,
// so it moves exactly with the finger and no script runs per frame. Browsers without scroll
// timelines (iOS < 26) and reduced motion fall back to steps: the third of the track at mid-screen
// picks the taste and a short CSS transition plays the change.
export function TasteSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const track = ref.current!;
    const pin = track.querySelector<HTMLElement>(".tv-pin")!;
    const bowl = track.querySelector<HTMLElement>("[data-bowl]")!;
    // Fade the bowl in once decoded so a slow image never pops in mid-scroll.
    const reveal = () => { bowl.dataset.ready = "true"; };
    bowl.querySelector<HTMLImageElement>("[data-a]")!.decode().then(reveal, reveal);
    // Centre the pinned card without a full-height wrapper, which left empty space after the section.
    const size = new ResizeObserver(() => track.style.setProperty("--pin-h", `${pin.offsetHeight}px`));
    size.observe(pin);
    if (CSS.supports("animation-timeline: view()") && !reducedMotion()) return () => size.disconnect();
    track.dataset.step = "0";
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) track.dataset.step = (entry.target as HTMLElement).dataset.i!;
    }), { rootMargin: "-50% 0px -50% 0px" });
    track.querySelectorAll(".tvs-third").forEach((third) => io.observe(third));
    return () => { size.disconnect(); io.disconnect(); };
  }, []);

  return <div ref={ref} className="tv-track tvs" data-taste-sec>
    <div className="tv-pin"><section className="tv-card" aria-labelledby="amsotto-taste-heading">
      <p className="v1-kicker">স্বাদটা চেখে দেখুন</p><h2 id="amsotto-taste-heading">একটা কামড়, তিনটে অনুভূতি</h2>
      <div className="tvs-stage" aria-hidden="true"><span className="tvs-glow" /><div className="tvs-bowl" data-bowl><img src={AMSOTTO_BITE_A_IMAGE} alt="" data-a fetchPriority="low" /><img src={AMSOTTO_BITE_B_IMAGE} alt="" data-b fetchPriority="low" /></div></div>
      <div className="tvs-words" aria-hidden="true">{T.map((t) => <span key={t.name} style={{ color: t.ink }}>{t.name}</span>)}</div>
      <div className="tvs-lines" aria-hidden="true">{T.map((t) => <p key={t.name}><b style={{ color: t.ink }}>{t.title}।</b> {t.line}</p>)}</div>
      <div className="tvs-progress" aria-hidden="true"><i /></div>
      <p className="tvs-hint" aria-hidden="true">নিচে স্ক্রল করুন <ArrowDown /></p>
      <ul className="tv-sr">{T.map((t) => <li key={t.name}>{t.step}: {t.title}। {t.line}</li>)}</ul>
    </section></div>
    {[0, 1, 2].map((i) => <span key={i} className="tvs-third" data-i={i} style={{ top: `${(i * 100) / 3}%` }} />)}
  </div>;
}
