import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => { const url = new URL(path, import.meta.url); return existsSync(url) ? readFileSync(url, "utf8") : ""; };
const page = read("./am-sotto-achar.tsx");
const checkout = read("../features/am-sotto-achar/amsotto-checkout.tsx");
const thankYou = read("./am-sotto-achar-thank-you.tsx");
const app = read("../App.tsx");

test("আমসত্ত্ব landing and separate thank-you routes are registered", () => {
  assert.match(app, /<Route path="\/step\/am-sotto-achar\/thank-you">/);
  assert.match(app, /<Route path="\/step\/am-sotto-achar">/);
  assert.match(app, /আমসত্ত্ব আচার \| সেরা খাবার/);
});
test("landing uses the live product and inventory API with the approved sections", () => {
  for (const name of ["fetchStorefrontProduct", "fetchStorefrontProductInventory", "mergeInventory", "STOREFRONT_POLL_INTERVAL_MS", "AmsottoHero", "TastePath", "RecipeMotion", "AmsottoCheckout", "AmsottoFooter"]) assert.ok(page.includes(name), name);
});
test("memo checkout validates live availability and uses the shared protection and capture", () => {
  for (const name of ["validateCheckout", "PaperClip", "buildProtectionPayload", "TurnstileChallenge", "useAbandonedCartCapture", "productQuery.refetch()", "inventoryQuery.refetch()", "freshInventoryVariant.stock_quantity", "MAX_LINE_QUANTITY", "normalizeBdMobile"]) assert.ok(checkout.includes(name), name);
  assert.match(checkout, /apiRequest\("POST", "\/api\/orders", payload\)/);
  assert.doesNotMatch(checkout, /PlaceCombobox|composeDeliveryAddress/);
  assert.doesNotMatch(checkout, /buildLandingOrderPayload/);
  assert.match(checkout, /response.status === 202 && result.decision === "review"/);
  assert.match(checkout, /response.status !== 201/);
  assert.match(checkout, /saveAmsottoConfirmation\(confirmation\)/);
  assert.match(checkout, /setLocation\(AMSOTTO_THANK_YOU_PATH\)/);
});
test("checkout and thank-you use the product id and shared event tracking", () => {
  assert.match(checkout, /trackGoogleEcommerceEvent\("view_item"/);
  assert.match(checkout, /trackGoogleEcommerceEvent\("begin_checkout"/);
  assert.match(thankYou, /trackGoogleEcommerceEvent\("purchase"/);
  assert.match(thankYou, /transactionId: confirmation.orderRef/);
  assert.match(thankYou, /markAmsottoPurchaseTracked/);
  assert.match(thankYou, /<OrderConfirmed/);
  assert.doesNotMatch(thankYou, /data-sk-checkout/);
});
test("approved fixed image assets are present", () => {
  for (const name of ["hero", "bite-a", "bite-b", "bowl"]) assert.ok(existsSync(new URL(`../../public/step/am-sotto-achar/amsotto-${name}-v1.webp`, import.meta.url)), name);
});

test("Quiet footer reuses the dock ringing phone and animates WhatsApp", () => {
  const footer = read("../features/am-sotto-achar/footer.tsx");
  assert.match(footer, /import \{ RingingPhoneIcon \} from "@\/components\/dock-contact"/);
  assert.match(footer, /<RingingPhoneIcon still=/);
  assert.match(footer, /fvq-whatsapp/);
});
