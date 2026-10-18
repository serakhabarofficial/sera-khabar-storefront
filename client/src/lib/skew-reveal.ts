import { stagger } from "framer-motion";
import { animate } from "framer-motion/dom/mini";

const SELECTOR = "[data-skew-reveal]";
const FONT_WAIT_MS = 2000;

// Hidden words wait for their web font (capped), so they never appear in the fallback face and
// then visibly swap glyphs once Noto Serif Bengali arrives.
function whenFontReady(element: HTMLElement) {
  if (typeof document === "undefined" || !document.fonts?.load) return Promise.resolve();
  const style = getComputedStyle(element);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return Promise.race([
    document.fonts.load(font, element.textContent ?? "").then(() => {}, () => {}),
    new Promise<void>((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
  ]);
}

// Approved option C (2026-10-14). React owns the words; this lifecycle only animates their styles.
// Default markup is visible, so missing observers or disabled JavaScript cannot hide headings.
export function startSkewReveal(root: HTMLElement, { instantInView = false } = {}) {
  if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return () => {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return () => {};

  const groups = new Map<HTMLElement, HTMLElement[]>();
  const animations = new Set<ReturnType<typeof animate>>();
  let stopped = false;

  const clearWords = (words: HTMLElement[]) => {
    words.forEach((word) => {
      for (const property of ["opacity", "filter", "transform", "will-change"]) word.style.removeProperty(property);
    });
  };

  const show = (element: HTMLElement, instant = false) => {
    const words = groups.get(element);
    if (!words || element.hasAttribute("data-skew-revealed")) return;
    element.setAttribute("data-skew-revealed", "");
    if (instant) {
      clearWords(words);
      return;
    }
    whenFontReady(element).then(() => {
      if (stopped) return;
      words.forEach((word) => { word.style.willChange = "filter, transform, opacity"; });
      const animation = animate(words, {
        opacity: 1,
        filter: "blur(0px)",
        transform: "translateY(0px) skewX(0deg)",
      }, {
        duration: 0.62,
        ease: [0.23, 1, 0.32, 1],
        delay: stagger(0.06, { startDelay: Number(element.dataset.skewDelay || 0) / 1000 }),
      });
      animations.add(animation);
      animation.then(() => {
        // Release Motion's final writes before removing the temporary inline styles.
        animation.cancel();
        clearWords(words);
        animations.delete(animation);
      });
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
      show(entry.target as HTMLElement);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });

  const watch = (element: HTMLElement) => {
    if (groups.has(element) || element.hasAttribute("data-skew-revealed")) return;
    const words = Array.from(element.querySelectorAll<HTMLElement>("[data-skew-word]"));
    if (!words.length) return;
    groups.set(element, words);
    const rect = element.getBoundingClientRect();
    // A history return restores content immediately, not another decorative entrance.
    if (rect.bottom <= 0 || (instantInView && rect.top < window.innerHeight)) {
      show(element, true);
      return;
    }
    words.forEach((word) => {
      word.style.opacity = "0";
      word.style.filter = "blur(8px)";
      word.style.transform = "translateY(10px) skewX(-12deg)";
    });
    observer.observe(element);
  };

  root.querySelectorAll<HTMLElement>(SELECTOR).forEach(watch);
  // Catalog refreshes can mount another shelf; only that new heading needs observing.
  const mutations = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(SELECTOR)) watch(node);
      node.querySelectorAll<HTMLElement>(SELECTOR).forEach(watch);
    }));
  });
  mutations.observe(root, { childList: true, subtree: true });

  const stop = () => {
    stopped = true;
    observer.disconnect();
    mutations.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    groups.forEach((words, element) => {
      clearWords(words);
      element.setAttribute("data-skew-revealed", "");
    });
  };
  const onPreferenceChange = () => { if (reducedMotion.matches) stop(); };
  reducedMotion.addEventListener("change", onPreferenceChange);

  return () => {
    reducedMotion.removeEventListener("change", onPreferenceChange);
    stop();
  };
}
