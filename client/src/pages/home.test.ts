import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

// The homepage follows the approved 2026-10-19 "Stage" redesign, direction দিক ১ · মঞ্চ.
const homeSource = readFileSync(new URL("./home.tsx", import.meta.url), "utf8");
const stageCss = readFileSync(new URL("../stage.css", import.meta.url), "utf8");
const indexCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("renders the approved sections in order", () => {
  const order = [
    "Hero Section",
    "Categories Section",
    "Promise Ribbon",
    "Products Section",
    "Story Section",
    "Achar Ad",
    "Homemade Section",
  ];

  let previous = -1;
  for (const marker of order) {
    const index = homeSource.indexOf(`{/* ${marker} */}`);
    assert.ok(index > previous, `${marker} should follow the previous homepage section`);
    previous = index;
  }
});

test("scopes the page under the Stage stylesheet: a white frame of hairline cells", () => {
  assert.match(homeSource, /<div className="st">\s*<div className="st-frame">/);
  assert.match(indexCss, /@import "\.\/stage\.css";/);
  assert.match(stageCss, /\.st \{ background: #fff; \}/);
  assert.match(stageCss, /\.st-row > \* \+ \* \{ border-left: 1px solid var\(--st-line\); \}/);
  for (const hex of ["#4a2212", "#9a6a52", "#ecd6c8", "#f08a1c"]) {
    assert.match(stageCss, new RegExp(hex, "i"));
  }
});

test("loads the Bengali faces the design uses", () => {
  assert.match(indexHtml, /family=Noto\+Serif\+Bengali:wght@300;400;500;600;700;800;900/);
  assert.match(indexHtml, /family=Noto\+Sans\+Bengali:wght@400;500;600;700/);
  assert.match(indexHtml, /family=Galada/);
  assert.match(homeSource, /BanglaNumber/);
});

test("tells the day from dawn sap to noon patali, opening on the dawn clip from Cloudflare R2", () => {
  assert.match(homeSource, /<h1 className="display" data-load-step="">\s*খেজুরের\s*<br \/>\s*খাঁটি <b>গুড়<\/b>/);
  assert.match(homeSource, /const DAY_MEDIA_ORIGIN = "https:\/\/pub-cfecc6eab1f44552a42789747b613cb7\.r2\.dev";/);
  assert.match(homeSource, /src: `\$\{DAY_MEDIA_ORIGIN\}\/hero\/dawn-v2\.mp4`/);
  // The clip is muted, inline and looping, and only plays while its panel shows.
  assert.match(homeSource, /src=\{DAY_DAWN\.src\}\s+poster=\{DAY_DAWN\.poster\}\s+muted\s+autoPlay=\{!shouldReduceMotion\}\s+loop\s+playsInline/);
  assert.match(homeSource, /if \(active === 0 && !shouldReduceMotion\) video\.play\(\)/);
  // The story bar is the clock: it fills smoothly, and its end opens the next moment. Hover pauses it; reduced motion has none.
  assert.match(homeSource, /data-run=\{\(bar === active && !shouldReduceMotion && steps\.length > 1\) \|\| undefined\}\s*onAnimationEnd=\{bar === active \? next : undefined\}/);
  assert.match(homeSource, /style=\{\{ "--dur": `\$\{duration\}ms` \} as CSSProperties\}/);
  assert.match(stageCss, /\.st-day-panels\[data-held\] \.st-day-bars i\[data-run\]::after \{ animation-play-state: paused; \}/);
  // Phones slide the next moment in like a story, and the time line fills from dot to dot.
  assert.match(stageCss, /\.st-day-pn\[data-prev\] \{ z-index: 1; transform: translateX\(-28%\);/);
  assert.match(stageCss, /\.st-day-fill\[data-run\] \{ animation: st-day-line var\(--dur\) linear forwards; \}/);
  // Product panels hold only the story; name, photo and price come from the live catalog, and a missing product drops out.
  const steps = homeSource.slice(homeSource.indexOf("const DAY_STEPS"), homeSource.indexOf("];", homeSource.indexOf("const DAY_STEPS")));
  assert.doesNotMatch(steps, /price|৳\d|[০-৯]{3}/);
  assert.match(homeSource, /const product = products\.find\(\(item\) => item\.slug === step\.slug\);\s*return product \? \[\{ \.\.\.step, product \}\] : \[\];/);
  assert.match(homeSource, /const \{ price \} = getStartingOption\(step\.product\);/);
  assert.match(homeSource, /const image = getProductImageSet\(step\.product\);/);
  assert.match(stageCss, /\.st-day-pn\[data-on\] \{ flex-grow: 3\.6; \}/);
});

test("keeps the live category cards' content in the Stage card", () => {
  assert.match(homeSource, /আমাদের <b>ক্যাটাগরিসমূহ<\/b>/);
  assert.match(homeSource, /যা খুঁজছেন/);
  assert.match(homeSource, /HOMEPAGE_CATEGORIES\.map/);
  assert.match(homeSource, /href=\{`\/collection\/\$\{category\.slug\}`\}/);
  assert.match(homeSource, /const count = productsInCollection\(products, category\.slug\)\.length;/);
  for (const image of ["category-mango", "category-homemade", "category-jaggery-date-palm"]) {
    assert.ok(existsSync(new URL(`../../public/home/${image}.webp`, import.meta.url)), image);
  }
});

test("writes the promise ribbon from the policy facts", () => {
  assert.match(homeSource, /POLICY_FACTS\.freeDeliveryThreshold/);
  assert.match(homeSource, /POLICY_FACTS\.dhakaDeliveryDays/);
  assert.match(homeSource, /POLICY_FACTS\.outsideDhakaDeliveryDays/);
  assert.match(stageCss, /\.st-mq-track \{ display: flex; width: max-content; animation: st-mq 46s linear infinite; \}/);
});

test("drives every product section from the live catalog", () => {
  assert.match(homeSource, /\.\.\.STOREFRONT_CATALOG_QUERY_OPTIONS/);
  assert.match(homeSource, /initialData: generatedStorefrontProducts/);
  assert.match(homeSource, /refetchInterval: STOREFRONT_POLL_INTERVAL_MS/);
  assert.match(homeSource, /<PosterProductCard key=\{product\.id \|\| product\.slug\} product=\{product\} look="stage" \/>/);
  assert.match(homeSource, /getTopSellingProducts\(products\)/);
  assert.match(homeSource, /getProductsForCollection/);
  assert.doesNotMatch(homeSource, /price: \d|"৳\d|৳\d/);
});

test("tells the jaggery story beside the founder's reel, served from Cloudflare R2", () => {
  assert.match(homeSource, /const FOUNDER_REEL_ORIGIN = "https:\/\/pub-cfecc6eab1f44552a42789747b613cb7\.r2\.dev";/);
  assert.match(homeSource, /src: `\$\{FOUNDER_REEL_ORIGIN\}\/story\/founder-reel-v1\.mp4`/);
  // Muted, looping and inline, so phones play it with no tap; it plays only while on screen.
  assert.match(homeSource, /<video\s+ref=\{videoRef\}\s+src=\{FOUNDER_REEL\.src\}\s+poster=\{FOUNDER_REEL\.poster\}\s+muted\s+autoPlay=\{!shouldReduceMotion\}\s+loop\s+playsInline/);
  assert.match(homeSource, /if \(entry\?\.isIntersecting\) video\.play\(\)/);
  assert.match(homeSource, /aria-label=\{muted \? "শব্দ চালু করুন" : "শব্দ বন্ধ করুন"\}/);
  // A refused autoplay shows the play button rather than a frozen poster.
  assert.match(homeSource, /\{paused && \(shouldReduceMotion \|\| blocked\) \? \(/);
  // Never proxied through a Vercel rewrite: its cache served one partial byte range to every request.
  const vercel = readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8");
  assert.doesNotMatch(vercel, /r2\.dev/);
  // Square and flat, as approved: no rounded corners or shadow on the reel.
  const reel = stageCss.match(/\.st-reel \{([^}]+)\}/)?.[1] ?? "";
  assert.doesNotMatch(reel, /border-radius|box-shadow/);
});

test("prices the আচার ad from catalog data and falls back to WhatsApp", () => {
  assert.match(homeSource, /<AcharAd product=\{homepageProducts\.find\(\(product\) => product\.slug === HOMEPAGE_AD_PRODUCT_SLUG\)\} \/>/);
  assert.match(homeSource, /const options = product \? getSizeOptions\(product\) : \[\];/);
  assert.match(homeSource, /href=\{WHATSAPP_ORDER_HREF\}/);
  assert.match(homeSource, /src="\/home\/achar-ad\.webp"/);
  assert.ok(existsSync(new URL("../../public/home/achar-ad.webp", import.meta.url)));
});

test("follows the motion rules and respects reduced motion", () => {
  assert.match(stageCss, /--st-ease-out: cubic-bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.match(stageCss, /\.stc \.press:active \{ transform: scale\(0\.97\); \}/);
  assert.match(stageCss, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(stageCss, /@media \(prefers-reduced-motion: reduce\)/);
  // Sections reveal through the shared scroll reveal, not a homepage-only observer.
  assert.match(homeSource, /data-reveal=""/);
  // (The reel's own observer only plays and pauses the video.)
  assert.doesNotMatch(homeSource, /classList\.add\("in"\)|data-revealed/);
});
