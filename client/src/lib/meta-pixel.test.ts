import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { META_PIXEL_ID } from "../../../shared/meta.ts";
import { buildGoogleEcommercePayload, toGoogleAnalyticsItem, trackGoogleEcommerceEvent } from "./google-analytics.ts";
import { readMetaCookies, trackMetaEcommerceEvent, trackMetaPageView } from "./meta-pixel.ts";

type Beacon = { url: string; body: Record<string, any> };

function withBrowser(run: (calls: unknown[][], beacons: Beacon[]) => void) {
  const calls: unknown[][] = [];
  const beacons: Beacon[] = [];
  const globals = globalThis as Record<string, unknown>;
  const previousWindow = globals.window;
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  globals.window = { fbq: (...args: unknown[]) => calls.push(args), location: { href: "https://www.serakhabar.com/product/gur" } };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      sendBeacon: (url: string, blob: Blob) => {
        // Blob.text() is async; the test reads the JSON the module built via a sync side channel instead.
        beacons.push({ url, body: (blob as Blob & { json?: Record<string, any> }).json ?? {} });
        return true;
      },
    },
  });
  const OriginalBlob = globalThis.Blob;
  globalThis.Blob = class extends OriginalBlob {
    json: Record<string, any>;
    constructor(parts: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      this.json = JSON.parse(String(parts[0]));
    }
  } as typeof Blob;
  try {
    run(calls, beacons);
  } finally {
    globalThis.Blob = OriginalBlob;
    globals.window = previousWindow;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
  }
}

const item = toGoogleAnalyticsItem({ id: "p-1", name: "খেজুরের গুড়", category: "gur", price: 450, quantity: 2 });

test("an ecommerce event goes to the Pixel and the server with one shared event_id", () => {
  withBrowser((calls, beacons) => {
    const eventId = trackMetaEcommerceEvent(buildGoogleEcommercePayload({
      event: "add_to_cart", pageType: "product", value: 900, items: [item],
    }));
    assert.ok(eventId);
    assert.deepEqual(calls, [["track", "AddToCart", {
      currency: "BDT",
      value: 900,
      content_type: "product",
      content_ids: ["p-1"],
      contents: [{ id: "p-1", quantity: 2, item_price: 450, title: "খেজুরের গুড়", category: "gur", brand: "Sera Khabar" }],
      num_items: 2,
      content_name: "খেজুরের গুড়",
      content_category: "gur",
    }, { eventID: eventId }]]);
    assert.equal(beacons.length, 1);
    assert.equal(beacons[0].url, "/api/storefront-signal");
    assert.equal(beacons[0].body.event_name, "AddToCart");
    assert.equal(beacons[0].body.event_id, eventId);
    assert.equal(beacons[0].body.event_source_url, "https://www.serakhabar.com/product/gur");
  });
});

test("Purchase uses the order reference as event_id and leaves the server send to checkout", () => {
  withBrowser((calls, beacons) => {
    const eventId = trackMetaEcommerceEvent(buildGoogleEcommercePayload({
      event: "purchase", pageType: "thank_you", value: 1000, items: [item], transactionId: "ORD-9", shipping: 100,
    }));
    assert.equal(eventId, "purchase-ORD-9");
    assert.equal(calls[0][1], "Purchase");
    assert.deepEqual(calls[0][3], { eventID: "purchase-ORD-9" });
    assert.equal((calls[0][2] as Record<string, unknown>).order_id, "ORD-9");
    assert.equal(beacons.length, 0);
  });
});

test("select_item has no Meta event and PageView is sent both ways", () => {
  withBrowser((calls, beacons) => {
    assert.equal(trackMetaEcommerceEvent(buildGoogleEcommercePayload({
      event: "select_item", pageType: "product", value: 450, items: [item],
    })), null);
    trackMetaPageView();
    assert.equal(calls.length, 1);
    assert.equal(calls[0][1], "PageView");
    assert.equal(beacons[0].body.event_name, "PageView");
    assert.equal(beacons[0].body.event_id, (calls[0][3] as { eventID: string }).eventID);
  });
});

test("view_cart and remove_from_cart stay in the dataLayer and never reach Meta", () => {
  withBrowser((calls, beacons) => {
    for (const event of ["view_cart", "remove_from_cart"] as const) {
      assert.equal(trackMetaEcommerceEvent(buildGoogleEcommercePayload({
        event, pageType: "cart", value: 450, items: [item],
      })), null);
    }
    assert.equal(calls.length, 0);
    assert.equal(beacons.length, 0);
  });
});

test("the dataLayer purchase carries the Meta event_id, fbp and fbc", () => {
  withBrowser(() => {
    const target = {
      dataLayer: [] as unknown[],
      location: new URL("https://www.serakhabar.com/checkout"),
      document: { title: "Checkout", cookie: "_fbp=fb.1.1.42; _fbc=fb.1.2.abc; x=1" },
    };
    const payload = trackGoogleEcommerceEvent("purchase", {
      pageType: "thank_you", value: 1000, items: [item], transactionId: "ORD-9", shipping: 100,
      customer: { name: "Rahim", phone: "01712345678", address: "Dhaka" },
    }, target);
    assert.equal(payload?.event_id, "purchase-ORD-9");
    assert.equal(payload?.fbp, "fb.1.1.42");
    assert.equal(payload?.fbc, "fb.1.2.abc");
    assert.deepEqual(payload?.ecommerce.customer, { name: "Rahim", phone: "01712345678", address: "Dhaka" });
  });
});

test("reads only the Meta cookies", () => {
  assert.deepEqual(readMetaCookies("a=1; _fbp=fb.1.1.42"), { fbp: "fb.1.1.42" });
  assert.deepEqual(readMetaCookies(undefined), {});
});

test("index.html loads the same Pixel with its own history PageView turned off", () => {
  const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(html, new RegExp(`fbq\\('init', '${META_PIXEL_ID}'\\)`));
  assert.match(html, /fbq\.disablePushState = true;/);
  assert.doesNotMatch(html, /fbq\('track'/);
});
