import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => {
  const url = new URL(path, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};
const contentSource = read("../features/kalojira-mixed/bori-content.ts");
const checkoutSource = read("../features/kalojira-mixed/kalojira-checkout.tsx");

test("bori WhatsApp href uses the exact Bengali order message", () => {
  assert.match(contentSource, /হোমমেড কুমড়ো বড়ি \| Homemade Pumpkin Bori অর্ডার করতে চাই/);
  assert.match(contentSource, /https:\/\/wa\.me\/8801303103540\?text=\$\{encodeURIComponent\(BORI_CAMPAIGN_WHATSAPP_MESSAGE\)\}/);
});

test("bori image slots are named constants", () => {
  for (const name of ["BORI_PACK_500G_IMAGE", "BORI_PACK_2KG_IMAGE", "BORI_STRIP_IMAGE", "BORI_QUOTE_IMAGE", "BORI_HERO_FALLBACK_IMAGE"]) {
    assert.match(contentSource, new RegExp(`export const ${name} =`));
  }
});

test("shared checkout uses the bori WhatsApp href for the bori product", () => {
  assert.match(checkoutSource, /import \{ BORI_CAMPAIGN_WHATSAPP_HREF \} from "\.\/bori-content";/);
  assert.match(checkoutSource, /product\?\.slug === "homemade-pumpkin-bori" \? BORI_CAMPAIGN_WHATSAPP_HREF/);
  assert.match(checkoutSource, /product\?\.slug === "katimon-mango" \? KATIMON_CAMPAIGN_WHATSAPP_HREF/);
});

const pageSource = read("./homemade-pumpkin-bori.tsx");
const appSource = read("../App.tsx");

test("bori route and title are registered", () => {
  assert.match(appSource, /import HomemadePumpkinBoriPage from "@\/pages\/homemade-pumpkin-bori";/);
  assert.match(appSource, /"\/step\/homemade-pumpkin-bori": "কুমড়ো বড়ি \| সেরা খাবার"/);
  assert.match(appSource, /<Route path="\/step\/homemade-pumpkin-bori">\s*<PageTransition standalone><HomemadePumpkinBoriPage \/><\/PageTransition>/);
});

test("bori page loads the bori product and checks out with ৳100 delivery", () => {
  assert.match(pageSource, /const slug = "homemade-pumpkin-bori";/);
  assert.match(pageSource, /deliveryCharge=\{100\}/);
});

test("every bori WhatsApp entry point uses the bori href", () => {
  assert.match(pageSource, /window\.open\(BORI_CAMPAIGN_WHATSAPP_HREF, "_blank"/);
  assert.match(pageSource, /<MobileOrderBar checkoutId="order" whatsappHref=\{BORI_CAMPAIGN_WHATSAPP_HREF\}/);
  assert.ok((pageSource.match(/href=\{BORI_CAMPAIGN_WHATSAPP_HREF\}/g) ?? []).length >= 2, "header and footer WhatsApp links");
  assert.doesNotMatch(pageSource, /KATIMON_CAMPAIGN_WHATSAPP_HREF|katimon-mango/);
});

test("bori hero and pack copy match the spec", () => {
  for (const text of ["ঐতিহ্যবাহী ঘরোয়া স্বাদ", "ঘরে তৈরি, রোদে শুকানো", "কুমড়ো বড়ি", "৳700", "৳1,300", "৳1,400", "৳2,600", "1KG", "2KG", "ছোট পরিবারের জন্য উপযুক্ত", "বড় পরিবার বা উপহারের জন্য পারফেক্ট"]) {
    assert.ok(pageSource.includes(text), `missing: ${text}`);
  }
});

test("bori story, quote, and image slots are present", () => {
  for (const text of ["ঘরোয়া পদ্ধতিতে তৈরি", "বাছাই করা মাষকলাইয়ের ডাল", "টাটকা চালকুমড়ো", "রোদে শুকানো", "ঐতিহ্যবাহী বাঙালি স্বাদ", "কুমড়ো বড়ি নিয়ে পুষ্টিবিদের কথা", "একজন পুষ্টিবিদ হিসেবে আমি সবসময় বলি", "— পুষ্টিবিদ মুরাদ পারভেজ"]) {
    assert.ok(pageSource.includes(text), `missing: ${text}`);
  }
  for (const name of ["BORI_PACK_500G_IMAGE", "BORI_PACK_2KG_IMAGE", "BORI_STRIP_IMAGE", "BORI_QUOTE_IMAGE", "BORI_HERO_FALLBACK_IMAGE"]) {
    assert.ok(pageSource.includes(name), `missing image slot: ${name}`);
  }
});

test("bori order CTAs scroll to checkout", () => {
  assert.ok((pageSource.match(/href="#order" onClick=\{handleOrderClick\}/g) ?? []).length >= 3);
});

test("bori WhatsApp href encodes the exact message", async () => {
  const { BORI_CAMPAIGN_WHATSAPP_HREF } = await import("../features/kalojira-mixed/bori-content.ts");
  assert.equal(BORI_CAMPAIGN_WHATSAPP_HREF, `https://wa.me/8801303103540?text=${encodeURIComponent("হোমমেড কুমড়ো বড়ি | Homemade Pumpkin Bori অর্ডার করতে চাই")}`);
});

test("bori cooking timeline replaces the bottom banner", () => {
  for (const text of ["যেভাবে রান্না করবেন", "রান্নার সহজ ধাপগুলো", "হালকা ভেজে নিন", "তরকারিতে দিন", "গরম গরম পরিবেশন করুন", "রান্না শেষ হওয়ার ৫–৭ মিনিট আগে ভাজা বড়ি মাছ বা সবজির ঝোলে দিন।"]) {
    assert.ok(pageSource.includes(text), `missing: ${text}`);
  }
  for (const n of [1, 2, 3]) {
    assert.ok(pageSource.includes(`/bori-cook-step-${n}.webp`), `missing step image ${n}`);
    assert.ok(existsSync(new URL(`../../public/bori-cook-step-${n}.webp`, import.meta.url)), `missing public asset ${n}`);
  }
  assert.doesNotMatch(pageSource, /BORI_BANNER_IMAGE/);
  assert.doesNotMatch(contentSource, /BORI_BANNER_IMAGE/);
  assert.ok(pageSource.indexOf("রান্নার সহজ ধাপগুলো") < pageSource.indexOf('id="order"'), "timeline sits above checkout");
});

test("bori cooking time is 5–7 minutes everywhere on the page", () => {
  assert.doesNotMatch(pageSource, /১৫–২০/);
  assert.ok((pageSource.match(/৫–৭ মিনিট/g) ?? []).length >= 1, "timeline step");
});

const cookingPathSource = read("../features/kalojira-mixed/bori-cooking-path.tsx");

test("cooking timeline is a winding path on mobile and desktop", () => {
  assert.match(pageSource, /import \{ BoriCookingPath \} from "@\/features\/kalojira-mixed\/bori-cooking-path";/);
  assert.match(pageSource, /<BoriCookingPath steps=\{COOKING_STEPS\} \/>/);
  assert.doesNotMatch(pageSource, /<ol className="relative/, "old desktop list removed");
  assert.match(cookingPathSource, /className="mx-auto max-w-\[480px\] lg:hidden"/);
  assert.match(cookingPathSource, /className="hidden lg:block"/);
  assert.match(cookingPathSource, /const MOBILE_LAYOUT: PathLayout/);
  assert.match(cookingPathSource, /const DESKTOP_LAYOUT: PathLayout/);
  for (const label of ["ভাজুন", "মেশান", "পরিবেশন"]) assert.ok(cookingPathSource.includes(label), `missing label: ${label}`);
  for (const numeral of ["০১", "০২", "০৩"]) assert.ok(cookingPathSource.includes(numeral), `missing numeral: ${numeral}`);
  assert.match(cookingPathSource, /pathLength/);
  assert.match(cookingPathSource, /<textPath/);
});

test("bori quote card uses the nutritionist cutout", () => {
  assert.match(contentSource, /export const BORI_QUOTE_IMAGE = "\/bori-nutritionist\.webp";/);
  assert.ok(existsSync(new URL("../../public/bori-nutritionist.webp", import.meta.url)), "missing nutritionist asset");
  assert.match(pageSource, /aspect-square min-h-0 bg-contain bg-bottom bg-no-repeat md:aspect-auto md:min-h-full/);
});

test("mobile cooking path runs straight into checkout", () => {
  assert.match(cookingPathSource, /viewH: 1040,/);
  assert.match(cookingPathSource, /C 190 925 200 990 195 1040"/);
  assert.match(pageSource, /aria-labelledby="bori-cooking-heading" className="mx-auto max-w-5xl px-5 pb-0 pt-4 md:pt-8 lg:pb-20"/);
});

test("bori header uses option B on mobile and desktop", () => {
  const header = pageSource.slice(pageSource.indexOf("<header"), pageSource.indexOf("</header>"));
  assert.match(header, /<header className="sticky top-0 z-40 border-b border-black\/\[0\.06\] bg-white\/95 backdrop-blur">/);
  assert.match(header, /<p className="hidden text-sm text-\[#19382d\]\/55 md:block"><span className="font-bold text-\[#19382d\]">ক্যাশ অন ডেলিভারি<\/span>/);
  assert.match(header, /সারা বাংলাদেশে<\/p>/);
  assert.match(header, /className="flex items-center md:absolute md:left-1\/2 md:-translate-x-1\/2"/);
  assert.match(header, /<nav aria-label="যোগাযোগ" className="ml-auto flex items-center gap-2\.5 md:gap-3\.5"><WhatsAppSwitch href=\{BORI_CAMPAIGN_WHATSAPP_HREF\} label="WhatsApp-এ অর্ডার করুন" \/>/);
  assert.equal((header.match(/href=\{BORI_CAMPAIGN_WHATSAPP_HREF\}/g) ?? []).length, 1, "one WhatsApp icon in header");
  assert.match(header, /<button type="button" onClick=\{scrollToOrder\} className="inline-flex min-h-10 items-center rounded-\[6px\] bg-\[#eab308\][^"]*md:px-6 md:text-\[15px\]">অর্ডার করুন<\/button>/);
  assert.doesNotMatch(header, /bg-\[#25d366\] px-4/, "old green mobile pill removed");
  assert.doesNotMatch(header, /KALOJIRA_CAMPAIGN_PHONE_HREF/);
  assert.match(header, /className="h-7 w-auto max-\[400px\]:h-6 max-\[340px\]:h-5 md:h-9"/);
  assert.match(header, /px-4 text-\[13px\] max-\[400px\]:px-3 max-\[400px\]:text-xs/);
});

test("bori 2KG pack card uses the cookie jar hero image", () => {
  assert.match(contentSource, /export const BORI_PACK_2KG_IMAGE = "\/bori-pack-2kg\.webp";/);
  assert.ok(existsSync(new URL("../../public/bori-pack-2kg.webp", import.meta.url)), "missing 2KG pack asset");
});

test("bori pack cards show the pack image full-width on top on mobile", () => {
  assert.match(pageSource, /<div className="min-w-0 md:pr-\[44%\]"><div className=\{`-mx-6 -mt-6 mb-5 flex h-60 items-center/);
  assert.match(pageSource, /bg-gradient-to-b from-\[#fff6d6\]/);
  assert.match(pageSource, /md:absolute/);
  assert.doesNotMatch(pageSource, /absolute right-1 top-16 h-48 w-\[40%\]/);
});

test("bori 2KG pack art sits flush against the card's right edge", () => {
  assert.match(pageSource, /size: "2KG"[^}]*bleedRight: true/);
  assert.match(pageSource, /size: "1KG"[^}]*bleedRight: false/);
  assert.match(pageSource, /pack\.bleedRight \? "justify-end pl-4 pr-0" : "justify-center px-4"/);
  assert.match(pageSource, /pack\.bleedRight \? "md:right-0" : "md:right-6"/);
  assert.match(pageSource, /pack\.bleedRight \? " object-right" : ""/);
});

test("bori quote card speaks as the nutritionist, not a recipe", () => {
  assert.doesNotMatch(pageSource, /কুমড়ো বড়ির স্বাদ ও রান্নার ধারণা/);
  assert.doesNotMatch(pageSource, /কুমড়ো বড়ি অল্প তেলে হালকা ভেজে/);
});

const thankYouSource = read("./kalojira-mixed-thank-you.tsx");

test("bori orders land on the bori thank-you page", () => {
  assert.match(checkoutSource, /const thankYouPath = product\?\.slug === "homemade-pumpkin-bori" \? "\/step\/homemade-pumpkin-bori\/thank-you" : "\/step\/kalojira-mixed\/thank-you";/);
  assert.match(checkoutSource, /setLocation\(thankYouPath\)/);
  assert.match(appSource, /<Route path="\/step\/homemade-pumpkin-bori\/thank-you">\s*<PageTransition standalone><KalojiraMixedThankYouPage backHref="\/step\/homemade-pumpkin-bori" backLabel="কুমড়ো বড়ি অর্ডার পেজে ফিরে যান" whatsappHref=\{BORI_CAMPAIGN_WHATSAPP_HREF\} \/><\/PageTransition>\s*<\/Route>\s*<Route path="\/step\/homemade-pumpkin-bori">/);
  assert.match(appSource, /"\/step\/homemade-pumpkin-bori\/thank-you": "কুমড়ো বড়ি অর্ডারের জন্য ধন্যবাদ \| সেরা খাবার"/);
  assert.match(thankYouSource, /<Link href=\{backHref\}/);
  assert.match(thankYouSource, /href=\{whatsappHref\}/);
});

const switchSource = read("../features/kalojira-mixed/whatsapp-switch.tsx");

test("header WhatsApp switch slides on tap and by drag before opening WhatsApp", () => {
  assert.match(switchSource, /drag="x"/);
  assert.match(switchSource, /dragConstraints=\{trackRef\}/);
  assert.match(switchSource, /if \(x\.get\(\) > travel\(\) \/ 2\) void openWhatsApp\(\)/);
  assert.match(switchSource, /await controls\.start\(\{ x: travel\(\), transition \}\);\s*const opened = window\.open\(href, "_blank"\);/);
  assert.match(switchSource, /event\.preventDefault\(\)/);
  assert.match(switchSource, /useReducedMotion/);
});
