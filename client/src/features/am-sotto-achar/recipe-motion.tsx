import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AMSOTTO_BOWL_IMAGE, reducedMotion } from "./content";
const loadPlayer = () => import("./recipe-player");
const RecipePlayer = lazy(loadPlayer);

// Fetch the player and decode the bowl photo once the page has loaded, so the walkthrough is
// ready before anyone scrolls to it and never starts on an empty frame.
function preloadRecipe() {
  const image = new Image();
  image.fetchPriority = "low";
  image.src = AMSOTTO_BOWL_IMAGE;
  return Promise.all([loadPlayer(), image.decode().catch(() => undefined)]);
}

export function RecipeMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(reducedMotion);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReduce(media.matches);
    media.addEventListener("change", changed);
    let cancelled = false;
    const start = () => { void preloadRecipe().then(() => { if (!cancelled) setReady(true); }); };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
    const play = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.45), { threshold: 0.45 });
    play.observe(ref.current!);
    return () => { cancelled = true; window.removeEventListener("load", start); media.removeEventListener("change", changed); play.disconnect(); };
  }, []);
  return <section className="v1-sec v1-recipe">
    <div className="v1-recipe-copy"><p className="v1-kicker">দাদির রেসিপি খাতা</p><h2>যা আছে, আর যা একদম নেই</h2><p className="v1-recipe-lede">চারটে জিনিস বাটিতে যায়। বাকি সব দাদি দরজা থেকেই ফিরিয়ে দিতেন।</p></div>
    <div className="v1-recipe-media">
      <div ref={ref} className="v1-recipe-stage" role="img" aria-label="বাটিতে যায়: রাজশাহীর বাগানের আমসত্ত্ব, হাতে বাছা গোটা মশলা, শুকনো মরিচ ও গুড়, ঘানি ভাঙা সরিষার তেল। যা একদম নেই: প্রিজারভেটিভ, কৃত্রিম রং, কেমিক্যাল।">
        {ready && <Suspense fallback={null}><RecipePlayer playing={visible} startAtEnd={reduce} /></Suspense>}
      </div>
    </div>
  </section>;
}
