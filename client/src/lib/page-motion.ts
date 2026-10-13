// Approved Subtle Depth: compositor-only motion, shared by route and content.
const PAGE_EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function getPageMotion(reducedMotion: boolean, depth = true) {
  const moves = depth && !reducedMotion;
  return {
    initial: {
      opacity: 0,
      transform: moves ? "translateY(6px) scale(0.985)" : "none",
    },
    animate: {
      opacity: 1,
      // Use an explicit identity endpoint, then clear the transform after the
      // native animation so the page does not retain a containing block.
      transform: moves ? "translateY(0px) scale(1)" : "none",
      transitionEnd: { transform: "none" },
      transition: { duration: reducedMotion ? 0.1 : 0.26, ease: PAGE_EASE },
    },
    exit: {
      opacity: 0,
      // The native driver starts exit from the actual current computed frame.
      transform: moves ? ["translateY(0px) scale(1)", "translateY(0px) scale(0.985)"] : "none",
      transition: { duration: reducedMotion ? 0.1 : 0.22, ease: PAGE_EASE },
    },
  };
}

export function getPageTransformOrigin(contentTop: number, viewportHeight: number) {
  return `50% ${Math.max(0, viewportHeight / 2 - contentTop)}px`;
}
