import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Before implementation, a missing module must produce an assertion failure,
// not a module-loader error. The tests then exercise the real motion boundary.
const motion = await import("./page-motion.ts").catch(() => null);

test("depth entry and exit settle quickly without layout or blur properties", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  const config = motion.getPageMotion(false);
  assert.equal(config.initial.opacity, 0);
  assert.equal(config.initial.transform, "translateY(6px) scale(0.985)");
  assert.equal(config.animate.opacity, 1);
  assert.equal(config.animate.transform, "translateY(0px) scale(1)");
  assert.equal(config.animate.transitionEnd.transform, "none");
  assert.equal(config.animate.transition.duration, 0.26);
  assert.deepEqual(config.animate.transition.ease, [0.23, 1, 0.32, 1]);
  assert.equal(config.exit.opacity, 0);
  assert.deepEqual(config.exit.transform, ["translateY(0px) scale(1)", "translateY(0px) scale(0.985)"]);
  assert.equal(config.exit.transition.duration, 0.22);
  for (const phase of [config.initial, config.animate, config.exit]) {
    assert.deepEqual(Object.keys(phase).filter((key) => key !== "transition" && key !== "transitionEnd").sort(), ["opacity", "transform"]);
  }
});

test("reduced motion keeps both route directions still with a short fade", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  for (const depth of [true, false]) {
    const config = motion.getPageMotion(true, depth);
    assert.equal(config.initial.transform, "none");
    assert.equal(config.animate.transform, "none");
    assert.equal(config.exit.transform, "none");
    assert.equal(config.animate.transition.duration, 0.1);
    assert.equal(config.exit.transition.duration, 0.1);
    assert.equal(config.initial.opacity, 0);
    assert.equal(config.animate.opacity, 1);
    assert.equal(config.exit.opacity, 0);
  }
});

test("the standard route shell crossfades without moving fixed navigation", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  const shell = motion.getPageMotion(false, false);
  assert.equal(shell.initial.transform, "none");
  assert.equal(shell.animate.transform, "none");
  assert.equal(shell.exit.transform, "none");
});

test("scale follows the visible viewport even on long scrolled pages", () => {
  assert.ok(motion, "shared page-motion implementation is missing");
  assert.equal(motion.getPageTransformOrigin(120, 900), "50% 330px");
  assert.equal(motion.getPageTransformOrigin(-2500, 900), "50% 2950px");
  assert.equal(motion.getPageTransformOrigin(500, 900), "50% 0px");
});

test("only main content uses the depth component, not header or dock", () => {
  const source = readFileSync(new URL("../components/layout.tsx", import.meta.url), "utf8");
  const main = source.slice(source.indexOf("<main"), source.indexOf("</main>") + 7);
  assert.match(main, /<PageContentTransition>/);
  assert.doesNotMatch(main, /mode="wait"|filter:|sk-dock|sk-header/);
  assert.equal((source.match(/<PageContentTransition>/g) ?? []).length, 1);
});

test("the app respects the device reduced-motion preference", () => {
  const source = readFileSync(new URL("../main.tsx", import.meta.url), "utf8");
  assert.match(source, /<MotionConfig reducedMotion="user">/);
});

test("history scroll is saved before wouter synchronously paints the destination", () => {
  const source = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  // A bubble-phase popstate listener runs after wouter's synchronous update,
  // overwriting the saved Home position with the new route's reset scrollY.
  assert.match(source, /addEventListener\("popstate", markHistoryNavigation, true\)/);
  assert.match(source, /removeEventListener\("popstate", markHistoryNavigation, true\)/);
  assert.match(source, /useLayoutEffect\(\(\) => \{\s*if \("scrollRestoration" in window\.history\)/);
});

test("navigation does not schedule late scroll resets after the animation finishes", () => {
  const source = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
  const router = source.slice(source.indexOf("function Router()"));
  assert.doesNotMatch(router, /window\.(setTimeout|requestAnimationFrame)/);
  assert.match(router, /window\.scrollTo\(\{ top: targetY, left: 0, behavior: "auto" \}\)/);
});
