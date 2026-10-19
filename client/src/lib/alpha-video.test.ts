import assert from "node:assert/strict";
import test from "node:test";
import { dropsWebmAlpha, prefersStillArt } from "./alpha-video.ts";

const UA = {
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  macEdge: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  macFirefox: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0",
  androidChrome: "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  iPhoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.0.0 Mobile/15E148 Safari/604.1",
  iPhoneFacebook: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22G86 [FBAN/FBIOS;FBAV/530.0.0]",
};

test("Chromium and Firefox keep WebM transparency, so they get the motion", () => {
  for (const ua of [UA.macChrome, UA.macEdge, UA.macFirefox, UA.androidChrome]) assert.equal(dropsWebmAlpha(ua), false, ua);
});

test("Safari and every iOS browser (WebKit) drop the transparency, so they get the still", () => {
  for (const ua of [UA.macSafari, UA.iPhoneChrome, UA.iPhoneFacebook]) assert.equal(dropsWebmAlpha(ua), true, ua);
  // iPadOS asks for desktop sites with a Mac user agent; touch points give it away.
  assert.equal(dropsWebmAlpha(UA.macSafari.replace("Version/26.0 Safari", "Version/26.0 Mobile Safari"), 5), true);
  assert.equal(dropsWebmAlpha(UA.macChrome, 5), true);
});

test("without a browser (server render) the still is the safe choice", () => {
  assert.equal(prefersStillArt(), true);
});

test("reduced motion gets the still even in a browser that keeps transparency", () => {
  const stub = (name: string, value: unknown) =>
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  const realNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const reduce = (matches: boolean) => () => ({ matches });
  stub("navigator", { userAgent: UA.macChrome, maxTouchPoints: 0 });
  try {
    stub("window", { matchMedia: reduce(true) });
    assert.equal(prefersStillArt(), true);
    stub("window", { matchMedia: reduce(false) });
    assert.equal(prefersStillArt(), false);
  } finally {
    delete (globalThis as Record<string, unknown>).window;
    if (realNavigator) Object.defineProperty(globalThis, "navigator", realNavigator);
    else delete (globalThis as Record<string, unknown>).navigator;
  }
});
