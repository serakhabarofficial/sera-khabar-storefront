// Scroll reveal for the approved storefront motion (2026-10-14). Elements marked `data-reveal`
// fade in when they reach the screen; a `data-reveal-img` inside settles from slightly large.
// The look lives in index.css and only applies under `data-reveal-ready`, which is set here —
// so without JavaScript (or IntersectionObserver) nothing is ever hidden.
export const REVEAL_SELECTOR = "[data-reveal]";
export const REVEAL_STAGGER_MS = 50;
const MAX_STAGGER_STEPS = 4;

export function startScrollReveal(root: HTMLElement, { instantInView = false } = {}) {
  if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return () => {};
  root.setAttribute("data-reveal-ready", "");

  const show = (element: Element) => element.setAttribute("data-revealed", "");

  const observer = new IntersectionObserver(
    (entries) => {
      // Items that arrive together (a row of cards) cascade 50ms apart, top-left first.
      const entering = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      entering.forEach((entry, index) => {
        const element = entry.target as HTMLElement;
        if (index > 0) {
          element.style.transitionDelay = `${Math.min(index, MAX_STAGGER_STEPS) * REVEAL_STAGGER_MS}ms`;
          element.addEventListener("transitionend", () => { element.style.transitionDelay = ""; }, { once: true });
        }
        show(element);
        observer.unobserve(element);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );

  const watch = (element: Element, instant: boolean) => {
    if (element.hasAttribute("data-revealed")) return;
    // Back navigation restores a page the shopper has already seen: what is on screen appears as-is.
    if (instant && element.getBoundingClientRect().top < window.innerHeight) {
      element.setAttribute("data-reveal-instant", "");
      show(element);
      requestAnimationFrame(() => requestAnimationFrame(() => element.removeAttribute("data-reveal-instant")));
      return;
    }
    observer.observe(element);
  };

  root.querySelectorAll(REVEAL_SELECTOR).forEach((element) => watch(element, instantInView));

  // Cards added later (a category tab switch, a live catalog refresh) reveal the same way.
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(REVEAL_SELECTOR)) watch(node, false);
        node.querySelectorAll(REVEAL_SELECTOR).forEach((element) => watch(element, false));
      });
    }
  });
  mutations.observe(root, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    mutations.disconnect();
  };
}
