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
    "Achar Ad",
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

test("renders the cash-memo hero with live prices and the jaggery photo", () => {
  // Same pinned memo as the footer, so the page opens and closes on one motif.
  assert.match(homeSource, /<div className="memo-w mh-w">\s*<span className="tack" \/>\s*<div className="memo">/);
  assert.match(homeSource, /<SkewReveal as="h1" className="mh-title" delay=\{70\}>খেজুরের পাটালী<\/SkewReveal>/);
  // Sizes and prices are read from the catalog product, never typed into the hero.
  assert.match(homeSource, /<MemoHero product=\{jaggeryProducts\.find\(\(product\) => product\.name\.includes\("পাটালী"\)\)\} \/>/);
  assert.match(homeSource, /sizes\.map\(\(option\) => \(\s*<Link key=\{option\.size\} href=\{href\} className="memo-row">/);
  assert.match(homeSource, /POLICY_FACTS\.freeDeliveryThreshold/);
  for (const file of ["hero-jaggery-memo.webp", "hero-jaggery-memo-640.webp"]) {
    assert.match(homeSource, new RegExp(`/home/${file.replace(".", "\\.")}`));
    assert.ok(existsSync(new URL(`../../public/home/${file}`, import.meta.url)));
  }
  // The old wordmark hero is gone, along with its styles.
  assert.doesNotMatch(homeSource, /className="c-word"|className="c-hero/);
  assert.doesNotMatch(posterCss, /\.sk \.c-hero|\.sk \.c-word/);
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

test("prices the offer band and the আচার ad from catalog data", () => {
  assert.match(homeSource, /HOMEPAGE_OFFER_PRODUCT_SLUG/);
  assert.match(homeSource, /offerProduct \? <OfferBand product=\{offerProduct\} \/> : null/);
  assert.match(homeSource, /getStartingOption\(product\)\.price/);
  assert.match(homeSource, /<AcharAdBoard product=\{homepageProducts\.find\(\(product\) => product\.slug === HOMEPAGE_AD_PRODUCT_SLUG\)\} \/>/);
  assert.match(homeSource, /<img className="ad-b-img" src="\/home\/achar-ad\.webp"/);
  assert.ok(existsSync(new URL("../../public/home/achar-ad.webp", import.meta.url)));
  // The hero sells the winter পাটালী, so the signboard must not repeat it.
  const boardStart = homeSource.indexOf("function AcharAdBoard");
  const board = homeSource.slice(boardStart, homeSource.indexOf("\n}\n", boardStart));
  assert.doesNotMatch(board, /পাটালী|jaggery-ad/);
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

test("uses the approved Skew reveal on display text without fading its parent twice", () => {
  assert.match(homeSource, /import SkewReveal from "@\/components\/skew-reveal"/);
  for (const title of ["এ বছরের নতুন", "আমাদের ক্যাটাগরিসমূহ", "আমাদের পণ্য", "রাজশাহীর রান্নাঘরের গল্প", "সাধারণ জিজ্ঞাসা"]) {
    assert.match(homeSource, new RegExp(`<SkewReveal[^>]*>${title}<\\/SkewReveal>`));
  }
  assert.match(homeSource, /<SkewReveal as="h2">\{title\}<\/SkewReveal>/);
  assert.doesNotMatch(homeSource, /className="(c-sec-head|c-story|ad-board|wrap fq)" data-reveal/);
  assert.doesNotMatch(homeSource, /<SkewReveal[^>]*(?:price|rows|ctas)/);
  const transition = readFileSync(new URL("../components/page-transition.tsx", import.meta.url), "utf8");
  assert.match(transition, /startSkewReveal\(root, \{ instantInView: back \}\)/);
  assert.match(transition, /stopSkewReveal\(\)/);
});

test("shows every size of a product as its own card on the category shelves", () => {
  const posterCard = readFileSync(new URL("../components/poster-product-card.tsx", import.meta.url), "utf8");
  assert.match(homeSource, /bySize && product\.variants\?\.length/);
  assert.match(homeSource, /product=\{product\} variant=\{variant\}/);
  assert.match(posterCard, /fixedVariant \?\? selectDefaultVariant\(product\)/);
});
