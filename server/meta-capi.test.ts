import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildMetaUserData, buildPurchaseEvent, parseBrowserMetaEvent, sendMetaEvents, type MetaServerEvent } from "./meta-capi.ts";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const host = "www.serakhabar.com";
const validEvent = {
  event_name: "AddToCart",
  event_id: "0b6f3c1e-8f0a-4c9e-9a51-3f3d2f1a7b10",
  event_source_url: "https://www.serakhabar.com/product/gur?fbclid=abc",
  custom_data: {
    currency: "BDT",
    value: 450,
    content_type: "product",
    content_ids: ["p-1"],
    contents: [{ id: "p-1", quantity: 1, item_price: 450, title: "খেজুরের গুড়", category: "gur", brand: "Sera Khabar" }],
    num_items: 1,
  },
};

test("accepts an allowed browser event and keeps only Meta's ecommerce fields", () => {
  const event = parseBrowserMetaEvent({ ...validEvent, custom_data: { ...validEvent.custom_data, phone: "01712345678" } }, host);
  assert.deepEqual(event, validEvent);
});

test("rejects Purchase, unknown events and pages from another host", () => {
  assert.equal(parseBrowserMetaEvent({ ...validEvent, event_name: "Purchase" }, host), null);
  assert.equal(parseBrowserMetaEvent({ ...validEvent, event_name: "Lead" }, host), null);
  assert.equal(parseBrowserMetaEvent({ ...validEvent, event_source_url: "https://evil.example/x" }, host), null);
  assert.equal(parseBrowserMetaEvent({ ...validEvent, event_id: "x" }, host), null);
  assert.equal(parseBrowserMetaEvent(validEvent, undefined), null);
});

test("user data carries IP, browser, Meta cookies and hashed identifiers only", () => {
  const userData = buildMetaUserData({
    "x-forwarded-for": "103.12.44.7, 10.0.0.1",
    "user-agent": "Mozilla/5.0",
    cookie: "_fbp=fb.1.1700000000000.42; other=1",
  }, {
    eventSourceUrl: validEvent.event_source_url,
    deviceId: "device-1",
    customer: { name: "  Rahim  Uddin Khan ", phone: "01712345678" },
  });
  assert.equal(userData.client_ip_address, "103.12.44.7");
  assert.equal(userData.client_user_agent, "Mozilla/5.0");
  assert.equal(userData.fbp, "fb.1.1700000000000.42");
  assert.match(userData.fbc ?? "", /^fb\.1\.\d{13}\.abc$/);
  assert.deepEqual(userData.ph, [sha256("8801712345678")]);
  assert.deepEqual(userData.fn, [sha256("rahim")]);
  assert.deepEqual(userData.ln, [sha256("uddin khan")]);
  assert.deepEqual(userData.country, [sha256("bd")]);
  assert.deepEqual(userData.external_id, [sha256("device-1")]);
});

test("the Pixel's _fbc cookie wins over a rebuilt one", () => {
  const userData = buildMetaUserData({ cookie: "_fbc=fb.1.1700000000000.real" }, { eventSourceUrl: validEvent.event_source_url });
  assert.equal(userData.fbc, "fb.1.1700000000000.real");
});

test("Purchase uses the order reference as the shared event_id", () => {
  const event = buildPurchaseEvent({
    bundleTitle: "খেজুরের গুড়",
    bundlePrice: 900,
    deliveryCharge: 100,
    customerName: "Rahim",
    phone: "01712345678",
    items: [{ productId: "p-1", quantity: 2 }],
  }, "ORD-9", { referer: "https://www.serakhabar.com/checkout" }, "device-1");
  assert.equal(event.event_id, "purchase-ORD-9");
  assert.deepEqual(event.custom_data, {
    currency: "BDT",
    value: 1000,
    content_type: "product",
    content_ids: ["p-1"],
    contents: [{ id: "p-1", quantity: 2 }],
    content_name: "খেজুরের গুড়",
    num_items: 2,
    order_id: "ORD-9",
    shipping: 100,
  });
});

const sample: MetaServerEvent = { event_name: "PageView", event_id: "e-1", event_time: 1, action_source: "website", user_data: {} };

test("sending is skipped without a token and posts the token in the body, not the URL", async () => {
  assert.deepEqual(await sendMetaEvents([sample], { token: "", fetchImpl: async () => { throw new Error("no call"); } }), { ok: false, skipped: true });

  let url = "";
  let body: Record<string, unknown> = {};
  const result = await sendMetaEvents([sample], {
    token: "secret-token",
    testEventCode: "TEST123",
    fetchImpl: async (input, init) => {
      url = String(input);
      body = JSON.parse(String(init?.body));
      return new Response("{}", { status: 200 });
    },
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(url, "https://graph.facebook.com/v23.0/1433713624268170/events");
  assert.equal(url.includes("secret-token"), false);
  assert.equal(body.access_token, "secret-token");
  assert.equal(body.test_event_code, "TEST123");
});

test("retries once after a Meta 5xx but not after a 4xx", async () => {
  let calls = 0;
  const warn = console.warn;
  console.warn = () => {};
  try {
    await sendMetaEvents([sample], { token: "t", fetchImpl: async () => { calls += 1; return new Response("", { status: 503 }); } });
    assert.equal(calls, 2);
    calls = 0;
    await sendMetaEvents([sample], { token: "t", fetchImpl: async () => { calls += 1; return new Response("", { status: 400 }); } });
    assert.equal(calls, 1);
  } finally {
    console.warn = warn;
  }
});
