import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// The homepage follows the approved 2026-10-13 "Market Poster" redesign
// (docs/design/2026-10-13-homepage, variant ক · রঙিন কার্ড).
const homeSource = readFileSync(new URL("./home.tsx", import.meta.url), "utf8");
const posterCss = readFileSync(new URL("../poster.css", import.meta.url), "utf8");
const indexCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("renders the approved sections in order", () => {
  const order = [
    "Hero Section",
    "Categories Section",
    "Products Section",
    "Offer Section",
    "Story Section",
    "Jaggery Shelf",
    "Jaggery Ad",
    "Homemade Shelf",
    "FAQ Section",
  ];

  let previous = -1;
  for (const marker of order) {
    const index = homeSource.indexOf(`{/* ${marker} */}`);
    assert.ok(index > previous, `${marker} should follow the previous homepage section`);
    previous = index;
  }
});

test("scopes the page under the poster stylesheet", () => {
  assert.match(homeSource, /<div className="sk">/);
  assert.match(indexCss, /@import "\.\/poster\.css";/);
  assert.match(posterCss, /container: site \/ inline-size;/);
});

test("uses the tamarind and turmeric palette", () => {
  for (const hex of ["#faf4ea", "#5b2d17", "#f6b826", "#e2547a", "#f1e5d3", "#3a1d0f", "#7a6050"]) {
    assert.match(posterCss, new RegExp(hex, "i"));
  }
});

test("loads Noto Serif Bengali and Galada and sets digits in Geist with a Bangla fallback", () => {
  assert.match(indexHtml, /family=Noto\+Serif\+Bengali:wght@400;500;600;700;800;900/);
  assert.match(indexHtml, /family=Geist:wght@100\.\.900/);
  assert.match(indexHtml, /family=Galada/);
  // Geist has no Bengali subset, so Bangla digits fall through to Noto Serif Bengali.
  assert.match(posterCss, /\.sk \.num \{[^}]*font-family: "Geist", "Noto Serif Bengali", serif;/);
  assert.match(homeSource, /withNumeralDigits|BanglaNumber/);
});

test("renders the giant wordmark hero with the hand-lettered accent", () => {
  assert.match(homeSource, /<span className="script tag">রাজশাহী থেকে<\/span>/);
  assert.match(homeSource, /<h1 className="c-word">/);
  assert.match(homeSource, /src="\/home\/hero-bori\.webp"/);
  assert.ok(existsSync(new URL("../../public/home/hero-bori.webp", import.meta.url)));
});

test("shows only the three coloured category cards, one per row on phones", () => {
  assert.match(homeSource, /আমাদের ক্যাটাগরিসমূহ/);
  assert.match(homeSource, /HOMEPAGE_CATEGORIES\.map/);
  assert.match(homeSource, /href=\{`\/collection\/\$\{category\.slug\}`\}/);
  assert.match(posterCss, /@container site \(max-width: 719px\) \{\n  \.sk \.fr-grid \{ grid-template-columns: 1fr;/);
  for (const image of ["category-mango", "category-homemade", "category-jaggery"]) {
    assert.ok(existsSync(new URL(`../../public/home/${image}.webp`, import.meta.url)), image);
  }
});

test("drives every product section from the live catalog", () => {
  assert.match(homeSource, /\.\.\.STOREFRONT_CATALOG_QUERY_OPTIONS/);
  assert.match(homeSource, /initialData: generatedStorefrontProducts/);
  assert.match(homeSource, /refetchInterval: STOREFRONT_POLL_INTERVAL_MS/);
  assert.match(homeSource, /<PosterProductCard key=/);
  assert.match(homeSource, /getProductsForCollection/);
  assert.doesNotMatch(homeSource, /price: \d|"৳\d/);
});

test("separates product shelves with a quiet hairline instead of a progress-style bar", () => {
  const divider = posterCss.match(/\.sk \.c-rule \{([^}]+)\}/)?.[1];
  assert.ok(divider, "product shelf divider styles should exist");
  assert.match(divider, /height: 1px;/);
  assert.match(divider, /background: color-mix\(in srgb, var\(--royal\) 18%, transparent\);/);
  assert.match(divider, /margin-top: 22px;/);
  assert.doesNotMatch(divider, /linear-gradient|var\(--pink\)|border-radius/);
});

test("prices the offer band and the jaggery ad from catalog data", () => {
  assert.match(homeSource, /HOMEPAGE_OFFER_PRODUCT_SLUG/);
  assert.match(homeSource, /offerProduct \? <OfferBand product=\{offerProduct\} \/> : null/);
  assert.match(homeSource, /getStartingOption\(product\)\.price/);
  assert.match(homeSource, /src="\/home\/jaggery-ad\.webp"/);
});

test("answers FAQ delivery questions from the policy facts", () => {
  assert.match(homeSource, /POLICY_FACTS\.deliveryCharge/);
  assert.match(homeSource, /POLICY_FACTS\.freeDeliveryThreshold/);
  assert.match(homeSource, /সাধারণ জিজ্ঞাসা/);
  assert.match(homeSource, /অন্য প্রশ্ন\? হোয়াটসঅ্যাপে লিখুন…/);
});

test("follows the motion rules and respects reduced motion", () => {
  assert.match(posterCss, /--ease-out: cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(posterCss, /\.sk \.press:active \{ transform: scale\(0\.97\); \}/);
  assert.match(posterCss, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(posterCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(homeSource, /useReducedMotion/);
});

test("shows every size of a product as its own card on the category shelves", () => {
  const posterCard = readFileSync(new URL("../components/poster-product-card.tsx", import.meta.url), "utf8");
  assert.match(homeSource, /bySize && product\.variants\?\.length/);
  assert.match(homeSource, /product=\{product\} variant=\{variant\}/);
  assert.match(posterCard, /fixedVariant \?\? selectDefaultVariant\(product\)/);
});
