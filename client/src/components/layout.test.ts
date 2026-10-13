import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

test("uses the turmeric Poster announcement, closable for the session", () => {
  // Approved 2026-10-13; the free-delivery amount comes from the same POLICY_FACTS checkout uses.
  assert.match(layoutSource, /<div className="sk-announce" role="region" aria-label="ঘোষণা">/);
  assert.match(layoutSource, /toBanglaDigits\(POLICY_FACTS\.freeDeliveryThreshold\)/);
  assert.match(layoutSource, /window\.sessionStorage\.setItem\(ANNOUNCEMENT_CLOSED_KEY, "1"\)/);
  assert.doesNotMatch(layoutSource, /Free shipping on orders over/);
});

test("keeps the compact white pill dock fixed at the bottom on phones", () => {
  // Approved 2026-10-13 ("Label"): it never hides; the active tab shows its name on a sliding highlight.
  assert.match(layoutSource, /<nav aria-label="Mobile navigation" className="sk-dock md:hidden">/);
  assert.doesNotMatch(layoutSource, /isAtPageBottom/);
  assert.match(layoutSource, /layoutId="sk-dock-highlight"/);
  assert.match(layoutSource, /duration: shouldReduceMotion \? 0 : 0\.22/);
  assert.match(layoutSource, /\{isActive && <span className="sk-dock-lbl">\{item\.label\}<\/span>\}/);
});

test("uses the existing icons in the mobile dock", () => {
  const dockSource = layoutSource.slice(layoutSource.indexOf('className="sk-dock md:hidden"'));
  for (const icon of ["<HomeDuotoneIcon", "<ReiconBox", "<SearchIcon", "<MenuLinesIcon", "<BagIcon"]) {
    assert.ok(dockSource.includes(icon), icon);
  }
});

test("uses the Solar cart icon in both desktop and mobile navigation", () => {
  assert.match(layoutSource, /viewBox="0 0 24 24"/);
  assert.match(layoutSource, /M16 9a1 1 0 1 1-2 0/);
  assert.equal((layoutSource.match(/<BagIcon /g) ?? []).length, 2);
});

test("keeps header cart icons balanced without changing the mobile dock", () => {
  assert.match(layoutSource, /<BagIcon className="h-5 w-5" \/>/);
  assert.match(layoutSource, /<BagIcon className="!h-7 !w-7" \/>/);
  assert.match(layoutSource, /<SearchIcon className="h-5 w-5" \/>/);
});

test("uses the mobile menu white treatment for the shared search overlay", () => {
  assert.match(layoutSource, /className="fixed inset-0 z-\[100\][^"]*bg-black\/10/);
  assert.match(layoutSource, /className="relative h-auto max-h-\[70dvh\] w-full[^"]*rounded-\[12px\][^"]*bg-white[^"]*md:max-w-xl/);
});

test("keeps search typing aligned to the left", () => {
  assert.match(layoutSource, /<form onSubmit=\{submitSearch\} className="[^"]*justify-start/);
  assert.match(layoutSource, /className="min-w-0 flex-1 bg-transparent text-left/);
});

test("matches the mobile menu inset shell around dock search", () => {
  assert.match(layoutSource, /className="fixed inset-0 z-\[100\][^"]*p-3 sm:p-4/);
  assert.match(layoutSource, /className="relative h-auto max-h-\[70dvh\] w-full[^"]*rounded-\[12px\][^"]*bg-white/);
});

test("keeps the mobile dock search panel compact", () => {
  assert.match(layoutSource, /className="relative h-auto max-h-\[70dvh\] w-full[^"]*md:h-auto/);
});

test("uses the poster header: turmeric menu button, centred logo, turmeric bag", () => {
  // Approved 2026-10-13 homepage redesign (docs/design/2026-10-13-homepage).
  assert.match(layoutSource, /<div className="sk sk-header">/);
  assert.match(layoutSource, /<header className="c-head">/);
  assert.match(layoutSource, /className="menu-btn press" aria-label="Open menu" onClick=\{openMenu\}/);
  assert.match(layoutSource, /<img className="c-logoimg" src=\{headerLogo\}/);
  assert.match(layoutSource, /className="bag press"/);
});

test("uses the pinned cash memo footer with the Arc Labs signature", () => {
  assert.match(layoutSource, /<footer className="sk">/);
  assert.match(layoutSource, /<b>ক্যাশ মেমো<\/b>/);
  assert.match(layoutSource, /className="stampc"/);
  assert.match(layoutSource, /<a className="sign" href="https:\/\/api\.whatsapp\.com\/send\/\?phone=8801733670129"/);
  for (const label of ["ফ্রেশ আম", "হোমমেড", "গুড়", "সব পণ্য", "কল করুন", "হোয়াটসঅ্যাপ করুন", "আমাদের গল্প", "পাইকারি অর্ডার"]) {
    assert.match(layoutSource, new RegExp(label));
  }
});

test("uses visible Featured Categories for menu navigation", () => {
  assert.match(layoutSource, /getVisibleFeaturedCollections/);
  assert.match(layoutSource, /getVisibleFeaturedCollections\(searchableProducts\)/);
  assert.match(layoutSource, /\/collection\/\$\{slug\}/);
  assert.match(layoutSource, /visibleCollections\.map/);
});

test("links Top Selling Products in desktop and mobile navigation", () => {
  const menuItemsStart = layoutSource.indexOf("const MENU_ITEMS = [");
  const menuItemsEnd = layoutSource.indexOf("] as const;", menuItemsStart);
  const mobileMenuStart = layoutSource.indexOf('<nav aria-label="Mobile menu"');
  const mobileMenuEnd = layoutSource.indexOf("</nav>", mobileMenuStart);

  assert.notEqual(menuItemsStart, -1);
  assert.notEqual(menuItemsEnd, -1);
  assert.notEqual(mobileMenuStart, -1);
  assert.notEqual(mobileMenuEnd, -1);

  const desktopMenuSource = layoutSource.slice(menuItemsStart, menuItemsEnd);
  const mobileMenuSource = layoutSource.slice(mobileMenuStart, mobileMenuEnd);
  assert.match(desktopMenuSource, /\/collection\/top-selling-products/);
  assert.match(desktopMenuSource, /Top Selling Products - সেরা বিক্রিত পণ্য/);
  assert.match(mobileMenuSource, /\/collection\/top-selling-products/);
  assert.match(mobileMenuSource, /Top Selling Products/);
  assert.match(mobileMenuSource, /সেরা বিক্রিত পণ্য/);
});

test("does not expose obsolete menu categories", () => {
  for (const label of ["Organic", "Spices", "Beverage", "Rice", "Flours & lentils"]) {
    assert.doesNotMatch(layoutSource, new RegExp(label.replace(/&/g, "\\&")));
  }
});

test("connects footer information and support links to real pages", () => {
  for (const path of [
    "/about-us",
    "/contact-us",
    "/how-to-order",
    "/shipping-policy",
    "/payment-policy",
    "/terms-and-conditions",
    "/privacy-policy",
    "/refund-return-exchange",
    "/cancellation-policy",
    "/faq",
    "/track-order",
  ]) {
    assert.match(layoutSource, new RegExp(path));
  }
  assert.doesNotMatch(layoutSource, /href="#"/);
});

test("uses Sera Khabar WhatsApp in customer navigation and Arc Labs WhatsApp only for the developer credit", () => {
  const bottomBarIndex = layoutSource.indexOf("/* Bottom Bar */");
  assert.notEqual(bottomBarIndex, -1);
  const customerNavigationSource = layoutSource.slice(0, bottomBarIndex);

  assert.match(customerNavigationSource, /phone=8801303103540/);
  assert.doesNotMatch(customerNavigationSource, /phone=8801733670129/);
  assert.match(layoutSource.slice(bottomBarIndex), /phone=8801733670129/);
});

test("mounts the floating add-to-cart toast beside the cart drawer", () => {
  assert.match(layoutSource, /import CartAddedToast from "@\/components\/cart-added-toast"/);
  assert.match(layoutSource, /<CartDrawer \/>\n\s+<CartAddedToast \/>/);
});

test("shows a numeric badge on the mobile dock cart instead of a dot", () => {
  assert.match(layoutSource, /itemCount > 99 \? "99\+" : itemCount/);
  assert.doesNotMatch(layoutSource, /h-1\.5 w-1\.5 rounded-full bg-\[#163B33\]/);
});

test("pulses the dock cart once per toast handoff, then clears the signal", () => {
  assert.match(layoutSource, /cartPulseKey, consumeCartPulse/);
  assert.match(layoutSource, /cartPulseKey > 0 \? " cart-dock-pulse" : ""/);
  assert.match(layoutSource, /if \(cartPulseKey > 0\) consumeCartPulse\(\);/);
});

test("clears the page-transition filter so carousels do not repaint the whole page", () => {
  assert.match(layoutSource, /animate=\{\{ opacity: 1, y: 0, filter: "blur\(0px\)", transitionEnd: \{ filter: "none" \} \}\}/);
});
