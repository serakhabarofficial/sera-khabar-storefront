import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Before implementation, a missing module must produce an assertion failure,
// not a module-loader error. The tests then exercise the real motion boundary.
const motion = await import("./page-motion.ts").catch(() => null);
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Settle fades the old page out quickly and the new one in, with the photo settling", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  const forward = motion.getPageMotion(false);
  assert.equal(forward.exit.duration, 150);
  assert.equal(forward.enter.duration, 260);
  assert.deepEqual(forward.settle, { scale: 1.04, duration: 600 });
  assert.equal(motion.PAGE_EASE, "cubic-bezier(0.23, 1, 0.32, 1)");
});

test("going back is a quicker fade and does not re-settle a page already seen", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  const back = motion.getPageMotion(false, true);
  assert.equal(back.enter.duration, 200);
  assert.equal(back.settle, null);
});

test("reduced motion keeps every route change to a short, still fade", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  for (const back of [false, true]) {
    const config = motion.getPageMotion(true, back);
    assert.equal(config.exit.duration, 100);
    assert.equal(config.enter.duration, 100);
    assert.equal(config.settle, null);
  }
  const load = motion.getLoadMotion(true);
  assert.equal(load.photo, null);
  assert.equal(load.steps.gap, 0);
});

test("a refresh settles the photo and fades the header and text up in order", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  const load = motion.getLoadMotion(false);
  assert.deepEqual(load.photo, { scale: 1.06, duration: 900 });
  assert.equal(load.header.duration, 240);
  assert.deepEqual(load.steps, { duration: 360, delay: 80, gap: 70 });
});

test("the queued route scroll is handed to exactly one entering page", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  assert.equal(motion.takeRouteScroll(), null);
  motion.queueRouteScroll(640, true);
  assert.deepEqual(motion.takeRouteScroll(), { top: 640, back: true });
  assert.equal(motion.takeRouteScroll(), null);
});

test("routes fade through: the next page mounts only after the old one has faded out", () => {
  const app = read("../App.tsx");
  assert.match(app, /<AnimatePresence mode="wait">\s*<Switch location=\{location\} key=\{location\}>/);
});

test("only main content fades between Layout pages, never the header or dock", () => {
  const layout = read("../components/layout.tsx");
  const main = layout.slice(layout.indexOf("<main"), layout.indexOf("</main>") + 7);
  assert.match(main, /<PageContentTransition>/);
  assert.doesNotMatch(main, /filter:|sk-dock|sk-header/);
  assert.equal((layout.match(/<PageContentTransition>/g) ?? []).length, 1);
  const transition = read("../components/page-transition.tsx");
  assert.match(transition, /querySelector<HTMLElement>\("\[data-page-content\]"\)/);
});

test("page motion animates only opacity and transform", () => {
  const transition = read("../components/page-transition.tsx");
  assert.match(transition, /\{ opacity: 0 \}, \{ opacity: 1 \}/);
  assert.doesNotMatch(transition, /\b(filter|clipPath|height|width|margin):/);
});

test("the app respects the device reduced-motion preference", () => {
  assert.match(read("../main.tsx"), /<MotionConfig reducedMotion="user">/);
});

test("history scroll is saved before wouter synchronously paints the destination", () => {
  const source = read("../App.tsx");
  // A bubble-phase popstate listener runs after wouter's synchronous update,
  // overwriting the saved Home position with the new route's reset scrollY.
  assert.match(source, /addEventListener\("popstate", markHistoryNavigation, true\)/);
  assert.match(source, /removeEventListener\("popstate", markHistoryNavigation, true\)/);
  assert.match(source, /useLayoutEffect\(\(\) => \{\s*if \("scrollRestoration" in window\.history\)/);
});

test("the old page never jumps: scroll is applied by the entering page before its first paint", () => {
  const app = read("../App.tsx");
  const router = app.slice(app.indexOf("function Router()"));
  assert.doesNotMatch(router, /window\.(setTimeout|requestAnimationFrame)/);
  assert.doesNotMatch(router, /window\.scrollTo\(\{ top: targetY/);
  assert.match(router, /queueRouteScroll\(targetY, isBack\)/);
  const transition = read("../components/page-transition.tsx");
  assert.match(transition, /const route = takeRouteScroll\(\);\s*if \(route\) window\.scrollTo\(\{ top: route\.top, left: 0, behavior: "auto" \}\);/);
});

test("sections reveal as they reach the screen, not when the page mounts", () => {
  const css = read("../index.css");
  const poster = read("../poster.css");
  assert.match(css, /\[data-reveal-ready\] \[data-reveal\]:not\(\[data-revealed\]\) \{\s*opacity: 0;/);
  assert.match(css, /\[data-reveal-ready\] \[data-reveal\]:not\(\[data-revealed\]\) \[data-reveal-img\] \{\s*transform: scale\(1\.08\);/);
  // The old mount-time animations finished off-screen before the shopper scrolled to them.
  assert.doesNotMatch(poster, /\.sk \.stagger|\.sk \.reveal|sk-clip-in|animation: sk-rise/);
  const home = read("../pages/home.tsx");
  assert.doesNotMatch(home, /className="[^"]*\b(stagger|reveal)\b/);
  assert.match(home, /className="c-hero-img"[^>]*data-page-settle=""/);
  assert.match(read("../components/poster-product-card.tsx"), /<article className="c-card" data-reveal="">/);
  assert.match(read("../pages/product.tsx"), /className="skp-gallery" data-page-settle=""/);
});

test("revealing product photos keep blending into the card instead of flashing white", () => {
  // The reveal scales the photo frame, which isolates it; the frame needs the card colour behind the photo.
  const poster = read("../poster.css");
  assert.match(poster, /\.sk \.c-blob \{[^}]*background: var\(--card-c\);/);
  assert.match(poster, /\.sk \.c-card \{[^}]*background: var\(--card-c\);/);
});
