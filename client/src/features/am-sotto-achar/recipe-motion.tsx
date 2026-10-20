import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { reducedMotion } from "./content";
const RecipePlayer = lazy(() => import("./recipe-player"));

export function RecipeMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduce, setReduce] = useState(reducedMotion);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setReduce(media.matches);
    media.addEventListener("change", changed);
    const load = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); load.disconnect(); } }, { rootMargin: "300px 0px" });
    const play = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.45), { threshold: 0.45 });
    load.observe(ref.current!); play.observe(ref.current!);
    return () => { media.removeEventListener("change", changed); load.disconnect(); play.disconnect(); };
  }, []);
  return <section className="v1-sec v1-recipe">
    <div className="v1-recipe-copy"><p className="v1-kicker">দাদির রেসিপি খাতা</p><h2>যা আছে, আর যা একদম নেই</h2><p className="v1-recipe-lede">চারটে জিনিস বাটিতে যায়। বাকি সব দাদি দরজা থেকেই ফিরিয়ে দিতেন।</p></div>
    <div className="v1-recipe-media">
      <div ref={ref} className="v1-recipe-stage" role="img" aria-label="বাটিতে যায়: রাজশাহীর বাগানের আমসত্ত্ব, হাতে বাছা গোটা মশলা, শুকনো মরিচ ও গুড়, ঘানি ভাঙা সরিষার তেল। যা একদম নেই: প্রিজারভেটিভ, কৃত্রিম রং, কেমিক্যাল।">
        {near && <Suspense fallback={null}><RecipePlayer playing={visible} startAtEnd={reduce} /></Suspense>}
      </div>
    </div>
  </section>;
}
