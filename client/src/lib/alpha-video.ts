// Our HyperFrames renders ship as VP9 WebM with a transparent background. WebKit (every iOS browser,
// and Safari on the Mac) plays the video but drops the transparency, so it would paint a black box.
export function dropsWebmAlpha(userAgent: string, maxTouchPoints = 0) {
  const iOS = /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
  return iOS || /^((?!chrome|chromium|android|edg).)*safari/i.test(userAgent);
}

/** True where a transparent video can't play as designed: WebKit, reduced motion, or no browser at all. */
export function prefersStillArt() {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  return dropsWebmAlpha(navigator.userAgent, navigator.maxTouchPoints);
}
