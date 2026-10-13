// Approved "Settle" page motion (2026-10-14, docs/design/2026-10-14-motion/motion-variants.html).
// Pages fade through: the old content fades out, the new content fades in while its main photo
// settles from slightly large. Compositor-only properties (opacity, transform) throughout.
export const PAGE_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

export function getPageMotion(reducedMotion: boolean, back = false) {
  return {
    exit: { duration: reducedMotion ? 100 : 150 },
    enter: { duration: reducedMotion ? 100 : back ? 200 : 260 },
    // Going back returns you to a page you have already seen, so its photo does not settle again.
    settle: reducedMotion || back ? null : { scale: 1.04, duration: 600 },
  };
}

// First paint after a refresh: the photo settles in while the header and text fade up in order.
export function getLoadMotion(reducedMotion: boolean) {
  return {
    photo: reducedMotion ? null : { scale: 1.06, duration: 900 },
    header: { duration: reducedMotion ? 100 : 240 },
    steps: { duration: reducedMotion ? 100 : 360, delay: reducedMotion ? 0 : 80, gap: reducedMotion ? 0 : 70 },
  };
}

// The Router decides where the next page should scroll to, but the scroll must happen only once
// the outgoing page has faded out — otherwise the old page visibly jumps. The Router queues the
// target here and the entering page applies it before its first paint.
let pendingRouteScroll: { top: number; back: boolean } | null = null;

export function queueRouteScroll(top: number, back: boolean) {
  pendingRouteScroll = { top, back };
}

export function takeRouteScroll() {
  const pending = pendingRouteScroll;
  pendingRouteScroll = null;
  return pending;
}
