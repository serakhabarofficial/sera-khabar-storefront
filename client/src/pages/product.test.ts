import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const productSource = readFileSync(new URL("./product.tsx", import.meta.url), "utf8");
const posterSource = readFileSync(new URL("../poster.css", import.meta.url), "utf8");

test("does not mark a live product unavailable while inventory is still loading", () => {
  assert.match(productSource, /const merchantUnavailable = merchantProductUnavailable \|\| inventoryUnavailable/);
  assert.match(productSource, /const inventoryUnavailable = merchantInventory\?\.inventory \? !isProductOrderable\(product\) : false/);
});

test("only clears stale product data after the Merchant Suite confirms a 404", () => {
  assert.match(productSource, /isFetchedAfterMount, isSuccess/);
  assert.match(productSource, /const productMissingFromMerchant = isFetchedAfterMount && isSuccess && merchantProduct === null/);
  assert.match(productSource, /const product = productMissingFromMerchant\s*\? null\s*:/);
  assert.match(productSource, /if \(!isFetchedAfterMount \|\| !isSuccess\) return;[\s\S]*?if \(merchantProduct === null\) \{[\s\S]*?removeCachedStorefrontProduct\(window\.localStorage, slug\);[\s\S]*?setCachedProduct\(null\);/);
  assert.match(productSource, /const merchantAvailabilityKnown = isFetchedAfterMount && isSuccess && merchantProduct !== undefined/);
  assert.doesNotMatch(productSource, /const merchantAvailabilityKnown = isFetched \|\| isError/);
});

test("lets customers choose a quantity for cart and direct checkout", () => {
  assert.match(productSource, /const \[quantity, setQuantity\] = useState\(1\)/);
  assert.match(productSource, /aria-label="Decrease quantity"/);
  assert.match(productSource, /disabled=\{quantity === 1\}/);
  assert.match(productSource, /aria-label="Increase quantity"/);
  assert.match(productSource, /Math\.max\(1, current - 1\)/);
  assert.match(productSource, /price: selectedBundle\.amount \* quantity/);
  assert.match(productSource, /selectedBundle\.title,\s*quantity/);
});

test("renders product reels as a left-aligned horizontal snap carousel", () => {
  assert.match(productSource, /const \[reelRef, reelApi\] = useEmblaCarousel/);
  // Embla measures slides from their offset parent, so the viewport must be positioned.
  assert.match(productSource, /ref=\{reelRef\} className="relative overflow-hidden/);
  assert.match(productSource, /const \[reelRef, reelApi\] = useEmblaCarousel\(\{\s*align: "start"/);
  assert.match(productSource, /loop: true/);
  assert.match(productSource, /duration: 35/);
  assert.match(productSource, /<section className="skp-reels skp-w" data-reveal="">/);
  assert.match(productSource, /mr-5 min-w-0/);
  assert.match(productSource, /basis-\[64vw\][^"`]*md:basis-\[220px\]/);
  // The active reel is outlined in brand yellow; the rest keep a transparent border so nothing shifts.
  assert.match(productSource, /border-2 p-\[3px\][^`]*\$\{i === currentReel \? "border-\[#FBBB14\]" : "border-transparent"\}/);
  assert.match(productSource, /REEL_MEDIA: readonly \{ src: string; poster: string \}\[\] = \[\];/);
  assert.match(productSource, /\{reelCount > 0 && \(/);
  assert.match(productSource, /from "@videojs\/react\/video"/);
  assert.match(productSource, /import "@videojs\/react\/video\/skin\.css"/);
  assert.match(productSource, /<VideoPlayer poster=\{poster\}>[\s\S]*?<VideoSkin[\s\S]*?<Video\b/);
  // Only the active slide mounts a <video>, so a mobile drag moves one cheap layer
  // instead of three decoding video layers.
  assert.match(productSource, /i === currentReel/);
  assert.match(productSource, /preload="metadata"/);
  // The sound player never autoplays; only the muted preview does.
  assert.doesNotMatch(productSource, /<Video\b[^>]*autoPlay/);
  assert.match(productSource, /Play className/);
  assert.match(productSource, /activeReelVideoRef/);
  assert.match(productSource, /src=\{poster\}[\s\S]*?pointer-events-none/);
  assert.match(productSource, /loading="lazy"/);
  assert.doesNotMatch(productSource, /video\.load\(\)/);
  assert.match(productSource, /will-change-transform/);
  assert.match(productSource, /"--media-accent-color": "#FBBB14"/);
  // No backdrop blur on the reel player: it re-blurs the video every frame of a swipe.
  assert.match(productSource, /"--media-backdrop-filter-surface": "none"/);
  // Swiping only moves posters: the player mounts on a play tap, inside that tap for iOS.
  assert.match(productSource, /i === playerReel \? \(\s*<VideoPlayer/);
  assert.match(productSource, /flushSync\(\(\) => setPlayerReel\(i\)\)/);
  assert.match(productSource, /setPlayerReel\(\(reel\) => \(reel === selected \? reel : null\)\)/);
  assert.match(productSource, /"--media-backdrop-filter-indicator": "none"/);
  assert.doesNotMatch(productSource, /h-16 w-16[^"]*backdrop-blur/);
  // Phones get tap-to-pause/play, and a big play icon shows whenever the reel is paused.
  assert.match(productSource, /<Gesture type="tap" action="togglePaused" pointer="touch" \/>/);
  assert.match(productSource, /<PlayButton[\s\S]*?hidden=\{!state\.paused\}/);
  assert.doesNotMatch(productSource, /pointer-events-none md:pointer-events-auto/);
  assert.doesNotMatch(productSource, /snap-center/);
  assert.match(productSource, /\[touch-action:pan-y_pinch-zoom\]/);
  assert.doesNotMatch(productSource, /scale-\[0\.94\]/);
  assert.match(productSource, /reelApi\.scrollPrev\(\)/);
  assert.match(productSource, /reelApi\.scrollNext\(\)/);
  assert.match(productSource, /root\.addEventListener\("pointermove", pauseReelsDuringDrag\)/);
  assert.doesNotMatch(productSource, /reelApi\.on\("scroll", pauseReelsDuringDrag\)/);
  assert.doesNotMatch(productSource, /reelApi\.on\("pointerDown"/);
  assert.doesNotMatch(productSource, /wistia-player/);
});

test("uses native Cloudinary reels only for Honey Nut", () => {
  assert.match(productSource, /const HONEY_NUT_REEL_MEDIA = \[/);
  assert.match(productSource, /FDown\.vn_Facebook_Video_Downloader_720p_HD__7925\.mp4/);
  assert.match(productSource, /snapsave-app_1432224402135483_hd\.mp4/);
  assert.match(productSource, /FDown\.vn_Facebook_Video_Downloader_720p_HD__8e09\.mp4/);
  assert.doesNotMatch(productSource, /player\.cloudinary\.com\/embed/);
  assert.match(productSource, /const honeyNutReelMedia = slug === "honey-nut" \? HONEY_NUT_REEL_MEDIA : null/);
  assert.match(productSource, /const reelMedia = honeyNutReelMedia \? honeyNutReelMedia : REEL_MEDIA/);
  assert.match(productSource, /reelMedia\.map\(\(\{ src, poster \}, i\) =>/);
  assert.match(productSource, /video\/upload\/so_1,w_480,f_auto,q_auto/);
  assert.match(productSource, /poster=\{poster\}/);
  assert.match(productSource, /className="relative aspect-\[9\/16\] w-full overflow-hidden rounded-\[6px\] bg-black"/);
});

test("navigates reels with arrow keys without hijacking editable controls", () => {
  assert.match(productSource, /const target = e\.target as HTMLElement \| null/);
  assert.match(productSource, /target instanceof HTMLInputElement[\s\S]*?target instanceof HTMLTextAreaElement[\s\S]*?target instanceof HTMLSelectElement[\s\S]*?target\?\.isContentEditable/);
  assert.match(productSource, /e\.preventDefault\(\);\s*goReel\(-1\)/);
  assert.match(productSource, /e\.preventDefault\(\);\s*goReel\(1\)/);
});

test("puts the reel title and round prev/next buttons in one header row", () => {
  assert.match(productSource, /<div className="skp-reels-head">\s*<h2>/);
  assert.match(productSource, /aria-label="Previous reel"[\s\S]*?className="skp-round press"/);
  assert.match(productSource, /aria-label="Next reel"[\s\S]*?className="skp-round press"/);
  // Arrows no longer float over the videos, and the dot pager is gone.
  assert.doesNotMatch(productSource, /absolute (left|right)-2 top-1\/2 flex -translate-y-1\/2 rounded-full/);
  assert.doesNotMatch(productSource, /aria-label=\{`Go to reel/);
});

test("uses the poster while the active native video is loading", () => {
  assert.match(productSource, /preload="metadata"/);
  assert.match(productSource, /poster=\{poster\}/);
  assert.doesNotMatch(productSource, /loadedHoneyNutReel/);
});

test("autoplays every on-screen reel as a muted loop and taps in sound", () => {
  // Muted + playsInline is what lets iOS and Android start a video without a tap.
  assert.match(productSource, /<video[\s\S]*?muted[\s\S]*?autoPlay[\s\S]*?loop[\s\S]*?playsInline/);
  // Every reel previews (not just the active one) while the section is on screen.
  assert.match(productSource, /showPreviews = reelsInView && !shouldReduceMotion/);
  assert.match(productSource, /showPreviews \? \(/);
  assert.match(productSource, /new IntersectionObserver/);
  // A drag freezes the previews on their current frame and settling resumes them,
  // so the moving track never carries three decoding videos.
  assert.match(productSource, /previewVideoRefs\.current\.forEach\(\(video\) => video\?\.pause\(\)\)/);
  assert.match(productSource, /reelApi\.on\("settle", resumePreviews\)/);
  // Tapping the active reel hands over to the sound player at the same moment.
  assert.match(productSource, /startReel\(i, previewVideoRefs\.current\[i\]\?\.currentTime/);
  assert.match(productSource, /`Play reel \$\{i \+ 1\} with sound`/);
});

// Product page redesign (approved 2026-10-13, docs/design/2026-10-13-product-page): "Classic" layout,
// Chips details as the footer cash memo, Calendar delivery estimate.
test("lays out photo, then title, price, sizes, quantity and order on the poster palette", () => {
  for (const cls of ["skp-photo", "skp-info", "skp-ticks", "skp-price", "skp-sizes", "skp-buyrow"]) {
    assert.match(productSource, new RegExp(`className="${cls}`));
  }
  // Sizes come before quantity, like the approved mockup.
  assert.ok(productSource.indexOf('className="skp-sizes') < productSource.indexOf('className="skp-buyrow'));
  assert.match(posterSource, /\.skp \{[^}]*--rice: #faf4ea;/);
});

test("keeps the product title without a description, English/weight badge or origin tagline beneath it", () => {
  assert.match(productSource, /<h1 data-load-step="">\{titleBn\}<\/h1>/);
  assert.doesNotMatch(productSource, /className="skp-lede"/);
  assert.doesNotMatch(productSource, /className="skp-pill"/);
  assert.doesNotMatch(productSource, /className="skp-tag script"/);
});

test("size cards show the size, the price and only real savings, with no per-kg line", () => {
  assert.match(productSource, /const sizeOffers = getSizeOffers\(bundles\)/);
  assert.match(productSource, /sizeOffers\[idx\]\?\.saving \?/);
  assert.doesNotMatch(productSource, /প্রতি কেজি/);
  // The saving is a round stamp on the card's corner: amount over সাশ্রয়.
  assert.match(productSource, /<span className="skp-badge">\s*<span>\{formatTaka\(sizeOffers\[idx\]\.saving\)\}<\/span>\s*<span>সাশ্রয়<\/span>/);
  assert.match(posterSource, /\.skp-badge \{[^}]*border-radius: 50%;[^}]*transform: rotate\(-12deg\);/);
});

test("a single size spans the row and is not offered as a choice", () => {
  assert.match(productSource, /bundles\.length > 1 \? "পরিমাণ বেছে নিন" : "পরিমাণ"/);
  assert.match(posterSource, /\.skp-sizes\[data-count="1"\] \{ grid-template-columns: minmax\(0, 1fr\); \}/);
});

test("keeps phone and WhatsApp ordering under অথবা, with no calendar delivery estimate", () => {
  const order = productSource.indexOf("ক্যাশ অন ডেলিভারিতে অর্ডার");
  const or = productSource.indexOf(">অথবা<");
  const phone = productSource.indexOf('href="tel:+8801310980289"');
  const whatsapp = productSource.indexOf("https://wa.me/8801303103540");
  assert.ok(order > 0 && or > order && phone > or && whatsapp > phone);
  assert.match(productSource, /ফোনে অর্ডার/);
  assert.match(productSource, /হোয়াটসঅ্যাপে অর্ডার/);
  assert.doesNotMatch(productSource, /className="skp-cal"/);
  assert.doesNotMatch(productSource, /আপনার দরজায় পৌঁছাবে/);
});

test("phone ordering uses the supplied white mobile-phone SVG", () => {
  const phoneLink = productSource.match(/<a href="tel:\+8801310980289"[\s\S]*?<\/a>/)?.[0] ?? "";
  // The narrow phone needs an optically larger, tightly cropped canvas beside the round WhatsApp mark.
  assert.match(phoneLink, /<svg[^>]*width="18"[^>]*height="24"[^>]*viewBox="7 1 11 22"/);
  assert.match(productSource, /<img src="https:\/\/cdn\.reicon\.dev\/logos\/whatsapp\/original\.svg" alt="" width=\{18\} height=\{18\}/);
  assert.match(phoneLink, /aria-hidden="true"/);
  assert.match(phoneLink, /<path fill="#ffffff" d="M15 2a1 1 0 0 0-1 1v3h-4/);
  assert.match(phoneLink, /ফোনে অর্ডার/);
  assert.doesNotMatch(phoneLink, /<Phone\b/);
});

test("details are chips that switch one footer-style cash memo", () => {
  assert.match(productSource, /role="tablist"/);
  assert.match(productSource, /className="skp-memo-w"/);
  assert.match(productSource, /<span className="tack"/);
  assert.match(productSource, /className="skp-memo-row"/);
  assert.match(posterSource, /\.skp-memo \{[^}]*repeating-linear-gradient/);
  // The details use the title font throughout.
  assert.match(posterSource, /\.skp-chips button \{[^}]*font-family: "Noto Serif Bengali"/);
  assert.match(posterSource, /\.skp-memo p \{[^}]*font-family: "Noto Serif Bengali"/);
});

test("related products use the homepage Stage product cell", () => {
  assert.match(productSource, /<PosterProductCard key=\{p\.slug\} product=\{p\} look="stage" \/>/);
  assert.doesNotMatch(productSource, /HomeProductCard/);
});

test("the breadcrumb uses the title font", () => {
  assert.match(posterSource, /\.skp-crumb \{[^}]*font-family: var\(--disp\);/);
});

// Gallery "ক্যাপসুল + মোজাইক" (approved 2026-10-19, docs/design/2026-10-19-product-gallery).
const mosaicSource = readFileSync(new URL("../components/product-mosaic.tsx", import.meta.url), "utf8");

test("phones pick a photo from round thumbnails in a capsule instead of dots", () => {
  assert.match(productSource, /className="skp-capsule"/);
  assert.doesNotMatch(productSource, /className="skp-dots"/);
  assert.match(productSource, /onClick=\{\(\) => goTo\(idx\)\}[\s\S]*?aria-current=\{active === idx\}/);
  assert.match(posterSource, /\.skp-capsule button\[aria-current="true"\] \{[^}]*transform: none;/);
});

test("the phone gallery swipe stays smooth on real phones", () => {
  // The active photo lives in PhoneGallery, so a swipe doesn't re-render the whole page.
  assert.match(productSource, /<PhoneGallery key=\{displayGallery\.join\(" "\)\} images=\{displayGallery\}/);
  assert.match(productSource, /className="skp-gallery" data-page-settle="" onScroll=/);
  // The photos scroll natively instead of being moved by JavaScript, so Chrome on iPhone and
  // the Facebook/Messenger browsers (which inject their own scripts) swipe as smoothly as Safari.
  assert.doesNotMatch(productSource, /galleryApi/);
  assert.match(posterSource, /\.skp-gallery \{[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory;/);
  assert.match(posterSource, /\.skp-slide \{[^}]*scroll-snap-align: start;/);
  assert.doesNotMatch(productSource, /setActiveImage/);
  // No backdrop blur over the moving photos.
  const capsule = posterSource.slice(posterSource.indexOf(".skp-capsule {")).split("}")[0];
  assert.doesNotMatch(capsule, /backdrop-filter/);
  // Clipped off-screen slides would otherwise load and decode mid-swipe.
  assert.match(productSource, /loading=\{idx < 3 \? "eager" : "lazy"\}/);
});

test("desktop shows every photo as a mosaic that opens a lightbox", () => {
  // Only products with more than one photo swap the carousel for the mosaic.
  assert.match(productSource, /const hasMosaic = displayGallery\.length > 1;/);
  assert.match(productSource, /<ProductMosaic images=\{displayGallery\}/);
  assert.match(posterSource, /@container skp \(min-width: 760px\) \{\s*\.skp-media\[data-mosaic\] > \.skp-photo \{ display: none; \}\s*\.skp-mosaic \{ display: block; \}/);
  assert.match(posterSource, /\.skp-tile-big \{[^}]*grid-column: span 2; grid-row: span 2;/);
  // The chip and cash-on-delivery seal ride on the big photo, the same markup as the phone panel.
  assert.match(mosaicSource, /\{idx === 0 \? badges : null\}/);
  assert.match(mosaicSource, /<Dialog\.Content[\s\S]*?onKeyDown=/);
  assert.match(mosaicSource, /event\.key === "ArrowLeft"\) step\(-1\)/);
  // Radix waits for the exit only when its animation name differs from the entrance.
  assert.match(posterSource, /\.skp-lb\[data-state="closed"\] \{ animation: skp-lb-out/);
});

test("desktop keeps the price and order buttons in view beside the tall mosaic", () => {
  assert.match(posterSource, /\.skp-info \{ position: sticky; top: 96px; \}/);
  assert.doesNotMatch(posterSource, /\.skp-left \{[^}]*position: sticky/);
});
