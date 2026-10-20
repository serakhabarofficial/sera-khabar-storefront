import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { currentLandingPagePath, normalizeLandingPagePath } from "./landing-page-attribution.ts";

test("normalizes current landing page paths", () => {
  assert.equal(normalizeLandingPagePath("/step/katimon-mango/"), "/step/katimon-mango");
  assert.equal(normalizeLandingPagePath("/step/homemade-pumpkin-bori?utm_campaign=summer#checkout"), "/step/homemade-pumpkin-bori");
});

test("rejects non-landing and unsafe paths", () => {
  for (const pathname of [
    "/",
    "/products",
    "/product/katimon-mango",
    "https://evil.example/step/fake",
    "/step/with spaces",
    "/step/../admin",
    "/step/",
  ]) {
    assert.equal(normalizeLandingPagePath(pathname), undefined, pathname);
  }
});

test("reads the browser pathname when available", () => {
  const previousLocation = globalThis.location;
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { pathname: "/step/katimon-mango" },
  });

  try {
    assert.equal(currentLandingPagePath(), "/step/katimon-mango");
  } finally {
    if (previousLocation) {
      Object.defineProperty(globalThis, "location", { configurable: true, value: previousLocation });
    } else {
      Reflect.deleteProperty(globalThis, "location");
    }
  }
});

test("all landing-page checkouts include the attribution field", () => {
  const checkoutSources = [
    new URL("../features/landing/landing-checkout.tsx", import.meta.url),
  ];

  for (const sourceUrl of checkoutSources) {
    const source = readFileSync(sourceUrl, "utf8");
    assert.match(source, /currentLandingPagePath/);
    assert.match(source, /landingPagePath/);
  }
});
