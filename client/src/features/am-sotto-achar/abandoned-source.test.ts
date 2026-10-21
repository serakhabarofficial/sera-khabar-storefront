import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAbandonedCartCapture } from "../../lib/abandoned-cart-capture";
import { parseAbandonedCartCapture as parseApiCapture } from "../../../../api/abandoned-carts";
import { parseAbandonedCartCapture as parseServerCapture } from "../../../../server/abandoned-cart-service";

const capture = (source: string, sourcePath: string) => ({
  draftKey: "3f2b8c1e-5d4a-4b6f-9a2e-1c7d8e9f0a1b",
  source,
  sourcePath,
  phone: "01712345678",
  items: [{ productName: "খেজুরের গুড়", variantName: "১ কেজি", quantity: 1, unitPrice: 600 }],
  subtotal: 600,
  deliveryRate: 100,
  total: 700,
});

test("landing checkouts capture under 'landing' with the page's own address", () => {
  for (const file of ["./amsotto-checkout.tsx", "../landing/landing-checkout.tsx"]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /useAbandonedCartCapture\("landing"/, file);
    assert.match(source, /currentLandingPagePath\(\)/, file);
  }
});

test("a landing capture sends the address it was given", async () => {
  const sent: unknown[] = [];
  const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(JSON.parse(String(init?.body)));
    return new Response("{}", { status: 202 });
  };
  const draft = createAbandonedCartCapture({ source: "landing", sourcePath: "/step/gur", draftScope: "/step/gur", fetchImpl, debounceMs: 0, createDraftKey: () => "3f2b8c1e-5d4a-4b6f-9a2e-1c7d8e9f0a1b" });
  draft.capture({ phone: "01712345678", items: [{ productName: "খেজুরের গুড়", quantity: 1, unitPrice: 600 }], subtotal: 600, deliveryRate: 100, total: 700 });
  await draft.flush();
  assert.deepEqual(sent.map((body) => [(body as { source: string }).source, (body as { sourcePath: string }).sourcePath]), [["landing", "/step/gur"]]);
  draft.dispose();
});

test("the capture API and server accept any landing address and nothing else", () => {
  for (const parse of [parseApiCapture, parseServerCapture]) {
    for (const path of ["/step/gur", "/step/katimon-mango", "/step/am-sotto-achar"]) {
      assert.equal(parse(capture("landing", path)).sourcePath, path);
    }
    for (const path of ["/checkout", "/step/", "/step/gur/thank-you", "/step/Gur", "/products/gur"]) {
      assert.throws(() => parse(capture("landing", path)), path);
    }
    assert.equal(parse(capture("storefront", "/checkout")).source, "storefront");
  }
});
