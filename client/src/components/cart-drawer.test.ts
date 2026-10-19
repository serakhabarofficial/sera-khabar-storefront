import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cartDrawerSource = readFileSync(new URL("./cart-drawer.tsx", import.meta.url), "utf8");
const posterSource = readFileSync(new URL("../poster.css", import.meta.url), "utf8");

const rule = (selector: string) => posterSource.slice(posterSource.indexOf(`${selector} {`)).split("}")[0];

test("the cart uses Geist, with Noto Serif Bengali only as the fallback for Bangla names (2026-10-20)", () => {
  assert.match(posterSource, /\.skc \{[^}]*font-family: "Geist", "Noto Serif Bengali", sans-serif;/s);
  for (const selector of [".skc-title", ".skc-info h3", ".skc-add h4", ".skc-sum h3", ".skc-empty h3"]) {
    assert.match(rule(selector), /font-family: "Geist", sans-serif;/, selector);
  }
  assert.match(rule(".skc-bn"), /font-family: "Noto Serif Bengali", serif;/);
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(html, /family=Geist:wght@100\.\.900/);
  assert.match(html, /family=Noto\+Serif\+Bengali:wght@300;400;500;600;700;800;900/);
});

test("cart prices and quantities use tabular Latin digits with the taka sign", () => {
  for (const selector of [".skc-price", ".skc-qty span", ".skc-total", ".skc-card-price", ".skc-ms-lab"]) {
    assert.match(rule(selector), /tabular-nums/, selector);
  }
  assert.match(cartDrawerSource, /const formatAmount = \(amount: number\) => `৳\$\{amount\.toLocaleString\("en-IN"\)\}`;/);
  assert.doesNotMatch(cartDrawerSource, /toBanglaDigits|formatTaka/);
});

test("the cart speaks English (2026-10-20, ঘর × রেফারেন্স — English)", () => {
  assert.match(cartDrawerSource, /<Drawer\.Title className="sr-only">Bag<\/Drawer\.Title>/);
  assert.match(cartDrawerSource, /Your bag is empty/);
  assert.match(cartDrawerSource, /Place order\s*<\/button>/);
  assert.match(cartDrawerSource, /Add <b>\{formatAmount\(freeDeliveryLeft\)\}<\/b> more for <b>free delivery<\/b>/);
  assert.doesNotMatch(cartDrawerSource, /ব্যাগ এখনও খালি|এর সাথে যোগ করুন|অর্ডার <i/);
  // Rows lead with the English product name and keep the Bangla one beneath.
  assert.match(cartDrawerSource, /<h3>\{english\}<\/h3>/);
  assert.match(cartDrawerSource, /\{bangla && <div className="skc-bn">\{bangla\}<\/div>\}/);
});

test("every cart row has its own always-visible Remove button", () => {
  const row = cartDrawerSource.slice(cartDrawerSource.indexOf('className="skc-row"'), cartDrawerSource.indexOf("</motion.li>"));
  assert.match(row, /onClick=\{\(\) => removeFromCart\(item\.id\)\} aria-label=\{`Remove \$\{english\}`\}/);
  assert.doesNotMatch(rule(".skc-remove"), /opacity: 0|display: none/);
});

test("each row can switch size in place, and offers the bigger pack when it is cheaper", () => {
  assert.match(cartDrawerSource, /<label className="skc-size">\s*<select/);
  assert.match(cartDrawerSource, /swapVariant\(item\.id, toCartProduct\(product, option\), option\.label, quantity, keep\)/);
  // Switching two 500 g packs to one 1 kg pack keeps an odd one as 500 g.
  assert.match(cartDrawerSource, /changeSize\(item, upgrade\.option, Math\.floor\(item\.quantity \/ 2\), item\.quantity % 2\)/);
  // Rows are keyed by product, so a size switch updates the row instead of folding it out and in.
  assert.match(cartDrawerSource, /return `\$\{item\.productUuid\}:\$\{n\}`;/);
  const cartContext = readFileSync(new URL("../contexts/cart-context.tsx", import.meta.url), "utf8");
  assert.match(cartContext, /const swapVariant = \(itemId: string, product: AddToCartProduct, size: string, quantity: number, keep = 0\) =>/);
});

test("the add-on rail is titled Add to your order and only offers sellable products", () => {
  assert.match(cartDrawerSource, /<h4 id="skc-add-title">Add to your order<\/h4>/);
  assert.match(cartDrawerSource, /if \(product\.available === false \|\| !productUuid \|\| !variantId\) continue;/);
  // Sideways scrolling inside the drawer must not drag it shut.
  assert.match(cartDrawerSource, /<ul className="skc-rail" data-vaul-no-drag>/);
  // The homepage's beige pill, with the header's handbag.
  assert.match(cartDrawerSource, /<span className="l1"><BagIcon className="skc-plus-ic" \/>Add<\/span>/);
});

test("the add-on that alone unlocks free delivery wears a round stamp", () => {
  assert.match(cartDrawerSource, /suggestions\.filter\(\(suggestion\) => suggestion\.amount >= freeDeliveryLeft\)/);
  assert.match(cartDrawerSource, /aria-label="Unlocks free delivery"/);
  assert.match(rule(".skc-stamp"), /border-radius: 50%;/);
  assert.match(rule(".skc-stamp"), /transform: rotate\(-12deg\);/);
});

test("the free-delivery milestone scrolls with the bag and hands over to a line on the header", () => {
  const body = cartDrawerSource.slice(cartDrawerSource.indexOf('className="skc-body"'));
  assert.match(body, /<div ref=\{milestoneRef\} className=\{`skc-ms/);
  assert.match(cartDrawerSource, /new IntersectionObserver\(\(\[entry\]\) => setPastMilestone\(!entry\.isIntersecting\), \{ root: body \}\)/);
  assert.match(cartDrawerSource, /className=\{`skc-mini\$\{pastMilestone \? " on" : ""\}`\}/);
});

test("the free-delivery line follows checkout's rule", () => {
  assert.match(cartDrawerSource, /POLICY_FACTS\.freeDeliveryThreshold/);
  assert.match(cartDrawerSource, /bundleHasFreeDeliveryProduct\(cartOrder\)/);
});

test("shows the total with the taka sign, including delivery like checkout does", () => {
  assert.match(cartDrawerSource, /formatAmount\(total\)/);
  assert.match(cartDrawerSource, /const total = subtotal \+ \(freeDeliveryLeft > 0 \? POLICY_FACTS\.deliveryCharge : 0\);/);
  assert.doesNotMatch(cartDrawerSource, /BDT \{/);
});

test("desktop cart is the same Vaul drawer as phones, as a floating right panel (2026-10-13)", () => {
  assert.match(cartDrawerSource, /<Drawer\.Root open=\{isOpen\} onOpenChange=\{setIsOpen\} direction=\{isMobile \? "bottom" : "right"\}>/);
  assert.match(cartDrawerSource, /isMobile \? "sk-sheet sk-cart-sheet" : "sk-panel sk-panel-right"/);
  assert.doesNotMatch(cartDrawerSource, /SheetContent/);
});

test("the whole cart is white, with the total on a warm band (2026-10-20)", () => {
  assert.match(posterSource, /\.sk-cart-sheet, \.sk-panel-right \{ background: #fff; \}/);
  assert.match(rule(".skc-card"), /background: #fff;/);
  assert.match(rule(".skc-foot"), /background: #faf5f0;/);
});

test("adding from the rail moves the product into the bag with a fold-away animation", () => {
  assert.match(cartDrawerSource, /if \(inCart\.has\(productUuid\)\) continue;/);
  const rail = cartDrawerSource.slice(cartDrawerSource.indexOf('<ul className="skc-rail"'), cartDrawerSource.indexOf("</ul>", cartDrawerSource.indexOf('<ul className="skc-rail"')));
  assert.match(rail, /<AnimatePresence initial=\{false\}>/);
  assert.match(rail, /\{\.\.\.railFold\(tileWidth\)\}/);
  // Animated boxes carry no padding: a padded box can't fold to 0 and jumps at the end.
  assert.doesNotMatch(rule(".skc-card-slot"), /padding/);
  assert.doesNotMatch(rule(".skc-item"), /padding/);
  assert.match(cartDrawerSource, /const foldEase = \[0\.4, 0, 0\.2, 1\] as const;/);
  assert.doesNotMatch(cartDrawerSource, /addedHere|data-added/);
});

test("adding or removing in the bag doesn't re-render the page behind it (2026-10-20)", () => {
  const cartContext = readFileSync(new URL("../contexts/cart-context.tsx", import.meta.url), "utf8");
  assert.match(cartContext, /const addToCart = useCallback\(/);
  assert.match(cartContext, /<AddToCartContext\.Provider value=\{addToCart\}>/);
  assert.match(cartContext, /afterNextPaint\(\(\) => \{\s*trackMerchantSuiteEvent\("cart"\);/);
  for (const file of ["./poster-product-card.tsx", "./home-product-card.tsx", "../pages/product.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /const addToCart = useAddToCart\(\);/, file);
    assert.doesNotMatch(source, /useCart\(\)/, file);
  }
  // Bag thumbnails take the small photo size, decoded off the main thread.
  assert.match(cartDrawerSource, /srcSet=\{thumbSrcSets\.get\(item\.image\)\}[^>]*decoding="async"/);
});

test("framer-motion is at least 12.43, which fixed the one-frame blink when a fade ends (2026-10-20)", () => {
  // Before 12.43 a finished fade showed its starting opacity for one frame: rail cards and bag rows blinked on add and remove.
  const pkg = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  const [major, minor] = pkg.dependencies["framer-motion"].replace(/^[^\d]*/, "").split(".").map(Number);
  assert.ok(major > 12 || (major === 12 && minor >= 43), pkg.dependencies["framer-motion"]);
});
