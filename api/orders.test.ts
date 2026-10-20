import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  OrderProtectionError,
  OrderUpstreamError,
  createOrderHandler,
  processOrder,
  validateOrder,
} from "./orders.ts";
import { MAX_LINE_QUANTITY_MESSAGE } from "../shared/order-limits.ts";

const canonicalItems = [{
  productId: "11111111-1111-4111-8111-111111111111",
  variantId: "22222222-2222-4222-8222-222222222222",
  quantity: 3,
}];

const validOrder = {
  bundleTitle: "Test product",
  bundleDetails: "1 kg",
  bundlePrice: 1500,
  quantity: 3,
  deliveryCharge: 100,
  customerName: "Test Customer",
  phone: "01712345678",
  address: "House 1 Road 2 Dhaka",
  paymentMethod: "cash_on_delivery",
  items: canonicalItems,
};

test("retains a positive whole-number quantity", () => {
  assert.equal(validateOrder(validOrder).quantity, 3);
});

test("trims whitespace around an otherwise valid phone number", () => {
  assert.equal(validateOrder({ ...validOrder, phone: " 01712345678 " }).phone, "01712345678");
});

test("accepts concise but real delivery addresses for staff confirmation", () => {
  assert.equal(validateOrder({ ...validOrder, address: "Dhanmondi, Dhaka" }).address, "Dhanmondi, Dhaka");
});

test("accepts +880 mobile format, rejects Bangla digits and ignores invalid optional telemetry", () => {
  assert.equal(validateOrder({ ...validOrder, phone: "+880 1712-345678" }).phone, "01712345678");
  assert.throws(() => validateOrder({ ...validOrder, phone: "+৮৮০ ১৭১২-৩৪৫৬৭৮" }));
  assert.equal(validateOrder({ ...validOrder, checkoutTelemetry: { phoneCandidates: ["bad"] } }).checkoutTelemetry, undefined);
});

test("rejects fake phone formats but drops malformed optional browser hints", () => {
  assert.throws(() => validateOrder({ ...validOrder, phone: "12345678901" }));
  assert.equal(validateOrder({ ...validOrder, deviceFingerprint: "A".repeat(64) }).deviceFingerprint, undefined);
  assert.deepEqual(validateOrder({ ...validOrder, deviceFingerprint: "a".repeat(64),
    checkoutTelemetry: { pastedFields: ["phone"] } }).checkoutTelemetry, { pastedFields: ["phone"] });
});

test("a signing failure does not prevent a valid order from reaching Merchant Suite", async () => {
  const previous = process.env.STOREFRONT_CONTEXT_SECRET;
  process.env.STOREFRONT_CONTEXT_SECRET = "test-context-secret-0123456789abcdef";
  const calls: unknown[] = [];
  let signCalls = 0;
  try {
    const handler = createOrderHandler({
      processOrder: async order => { calls.push(order); return { decision: "allow", orderRef: "ML-1" }; },
      signContext: () => { signCalls++; throw new Error("signing unavailable"); },
    });
    const req = createRequest(validOrder);
    req.headers["x-vercel-forwarded-for"] = "103.12.44.7";
    const { response, read } = createResponse();
    await handler(req, response);
    assert.equal(signCalls, 1);
    assert.equal(calls.length, 1);
    assert.equal(read().status, 201);
  } finally {
    if (previous === undefined) delete process.env.STOREFRONT_CONTEXT_SECRET;
    else process.env.STOREFRONT_CONTEXT_SECRET = previous;
  }
});

test("validates and normalizes optional landing-page attribution", () => {
  assert.equal(
    validateOrder({ ...validOrder, landingPagePath: "/step/katimon-mango/?utm_campaign=summer" }).landingPagePath,
    "/step/katimon-mango",
  );
  assert.equal(validateOrder(validOrder).landingPagePath, undefined);
  for (const landingPagePath of ["https://evil.example/step/fake", "/products", "/step/with spaces", "/step/"]) {
    assert.throws(() => validateOrder({ ...validOrder, landingPagePath }));
  }
});

test("rejects invalid quantities", () => {
  const { quantity: _quantity, ...withoutQuantity } = validOrder;
  assert.throws(() => validateOrder(withoutQuantity));

  for (const quantity of [0, -1, 1.5]) {
    assert.throws(() => validateOrder({ ...validOrder, quantity }));
  }
});

const dependencies = {
  merchantSuiteUrl: "https://suite.invalid",
  storefrontHandle: "serakhabar",
  timeoutSignal: () => new AbortController().signal,
};

test("forwards signed context but never forwards raw browser hints", async () => {
  let headers: Record<string, string> | undefined;
  let body: Record<string, unknown> | undefined;
  await processOrder(validateOrder({ ...validOrder, deviceFingerprint: "a".repeat(64),
    checkoutTelemetry: { phoneCandidates: ["01712345678"] } }), {
    ...dependencies, clientContextHeader: "signed.payload",
    fetchImpl: async (_url, init) => {
      headers = init?.headers as Record<string, string>;
      body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ orderRef: "ML-1" }), { status: 201 });
    },
  });
  assert.equal(headers?.["x-mlbd-client-context"], "signed.payload");
  assert.equal("deviceFingerprint" in (body ?? {}), false);
  assert.equal("checkoutTelemetry" in (body ?? {}), false);
});

test("preserves upstream rate limiting as a retryable checkout response", async () => {
  await assert.rejects(() => processOrder(validateOrder(validOrder), { ...dependencies,
    fetchImpl: async () => new Response(JSON.stringify({ message: "Slow down" }), { status: 429 }),
  }), (error: unknown) => error instanceof OrderUpstreamError && error.statusCode === 429);
});

test("strips retired tracking fields from checkout input", () => {
  const order = validateOrder({ ...validOrder, trackingMode: "google_only", metaEventId: "meta-secret" });
  assert.equal("trackingMode" in order, false);
  assert.equal("metaEventId" in order, false);
});

test("accepts an optional checkout draft key only when it is a UUID", () => {
  assert.equal(
    validateOrder({ ...validOrder, draftKey: "7CB13B8E-B576-4FAA-B238-CC8B73059772" }).draftKey,
    "7cb13b8e-b576-4faa-b238-cc8b73059772",
  );
  assert.throws(() => validateOrder({ ...validOrder, draftKey: "not-a-draft" }));
});

test("accepts bounded order-protection signals and canonical items", () => {
  const order = validateOrder({
    ...validOrder,
    website: "",
    turnstileToken: "turnstile-token",
    clientSessionId: "session-123",
    checkoutStartedAt: "2026-09-12T10:00:00.000Z",
    items: canonicalItems,
    shippingZoneId: "inside-dhaka",
  });
  assert.deepEqual(order.items, canonicalItems);
  assert.equal(order.shippingZoneId, "inside-dhaka");
  assert.equal(order.turnstileToken, "turnstile-token");
});

test("matches the reviewed bounded validation contract without coercion", () => {
  const accepted = [
    { deliveryCharge: 0 },
    { bundleTitle: "T".repeat(200) },
    { bundleDetails: "D".repeat(300) },
    { bundlePrice: 10_000_000 },
    { quantity: 100 },
    { deliveryCharge: 100_000 },
    { customerName: "N".repeat(120) },
    { address: "A B " + "C".repeat(496) },
    { paymentMethod: undefined },
  ];
  for (const override of accepted) {
    assert.doesNotThrow(() => validateOrder({ ...validOrder, ...override }));
  }

  const rejected = [
    { bundleTitle: "T".repeat(201) },
    { bundleDetails: "D".repeat(301) },
    { bundlePrice: 10_000_001 },
    { bundlePrice: Number.MAX_SAFE_INTEGER },
    { quantity: 101 },
    { quantity: Number.MAX_SAFE_INTEGER },
    { deliveryCharge: 100_001 },
    { customerName: "N".repeat(121) },
    { phone: "1234567890" },
    { address: "Ab" },
    { address: "A B " + "C".repeat(497) },
    { paymentMethod: "card" },
    { bkashTrxId: "B".repeat(81) },
  ];
  for (const override of rejected) {
    assert.throws(() => validateOrder({ ...validOrder, ...override }));
  }
});

test("forwards the exact allowlisted Merchant-Suite body and canonical ID", async () => {
  let outboundBody: unknown;
  const order = validateOrder(validOrder);
  const result = await processOrder(order, {
    ...dependencies,
    fetchImpl: async (_input, init) => {
      outboundBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ order_id: "ML-150000" }), { status: 200 });
    },
  });

  assert.deepEqual(result, { orderRef: "ML-150000", decision: "allow" });
  assert.deepEqual(outboundBody, {
    customerName: "Test Customer",
    phone: "01712345678",
    address: "House 1 Road 2 Dhaka",
    items: canonicalItems,
    notes: "Test product - 1 kg",
  });
});

test("posts canonical checkout data to the public handle endpoint", async () => {
  let outboundUrl = "";
  let outboundBody: Record<string, unknown> | undefined;
  let outboundHeaders: Record<string, string> | undefined;
  const order = validateOrder({
    ...validOrder,
    items: canonicalItems,
    shippingZoneId: "inside-dhaka",
    website: "",
    turnstileToken: "turnstile-token",
    clientSessionId: "session-123",
    checkoutStartedAt: "2026-09-12T10:00:00.000Z",
  });
  const result = await processOrder(order, {
    ...dependencies,
    fetchImpl: async (input, init) => {
      outboundUrl = String(input);
      outboundHeaders = init?.headers as Record<string, string>;
      outboundBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ orderRef: "ML-150002", decision: "allow" }), { status: 201 });
    },
  });

  assert.equal(outboundUrl, "https://suite.invalid/api/public/v1/serakhabar/orders");
  assert.deepEqual(outboundHeaders, { "Content-Type": "application/json" });
  assert.deepEqual(result, { orderRef: "ML-150002", decision: "allow" });
  assert.deepEqual(outboundBody, {
    customerName: "Test Customer",
    phone: "01712345678",
    address: "House 1 Road 2 Dhaka",
    items: canonicalItems,
    shippingZoneId: "inside-dhaka",
    website: "",
    turnstileToken: "turnstile-token",
    clientSessionId: "session-123",
    checkoutStartedAt: "2026-09-12T10:00:00.000Z",
    notes: "Test product - 1 kg",
  });
});

test("returns a review hold without turning it into an upstream failure", async () => {
  const order = validateOrder({ ...validOrder, items: canonicalItems });
  const result = await processOrder(order, {
    ...dependencies,
    fetchImpl: async () => new Response(JSON.stringify({ decision: "review", review_id: "review-1" }), { status: 202 }),
  });
  assert.deepEqual(result, { decision: "review", reviewId: "review-1" });
});

test("surfaces a customer-safe typed block error", async () => {
  const order = validateOrder({ ...validOrder, items: canonicalItems });
  await assert.rejects(
    () => processOrder(order, {
      ...dependencies,
      fetchImpl: async () => new Response(JSON.stringify({ decision: "block", retryable: false }), { status: 403 }),
    }),
    (error: unknown) => error instanceof OrderProtectionError
      && error.decision === "block"
      && error.retryable === false,
  );
});

test("forwards a validated checkout draft key only through the secret-backed order path", async () => {
  let outboundBody: unknown;
  const order = validateOrder({
    ...validOrder,
    draftKey: "7cb13b8e-b576-4faa-b238-cc8b73059772",
  });

  await processOrder(order, {
    ...dependencies,
    fetchImpl: async (_input, init) => {
      outboundBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ order_id: "ML-150001" }), { status: 200 });
    },
  });

  assert.deepEqual(outboundBody, {
    customerName: "Test Customer",
    phone: "01712345678",
    address: "House 1 Road 2 Dhaka",
    items: canonicalItems,
    notes: "Test product - 1 kg",
    abandoned_checkout_draft_key: "7cb13b8e-b576-4faa-b238-cc8b73059772",
  });
});

test("requires a canonical Merchant-Suite ID", async () => {
  const order = validateOrder(validOrder);
  const failures = [
    async () => new Response("failure", { status: 503 }),
    async () => { throw new Error("network"); },
    async () => { throw new DOMException("timed out", "TimeoutError"); },
    async () => new Response("not-json", { status: 200 }),
    async () => new Response("{}", { status: 200 }),
    async () => new Response(JSON.stringify({ order_id: false }), { status: 200 }),
  ];
  for (const fetchImpl of failures) {
    await assert.rejects(() => processOrder(order, { ...dependencies, fetchImpl }), OrderUpstreamError);
  }
});

test("rejects every webhook failure without a fake reference", async () => {
  const order = validateOrder(validOrder);
  const failures = [
    async () => new Response("failure", { status: 503 }),
    async () => { throw new Error("network"); },
    async () => { throw new DOMException("timed out", "TimeoutError"); },
    async () => new Response("not-json", { status: 200 }),
    async () => new Response("{}", { status: 200 }),
  ];
  for (const fetchImpl of failures) {
    await assert.rejects(
      () => processOrder(order, { ...dependencies, fetchImpl }),
      OrderUpstreamError,
    );
  }
});

function createRequest(body?: unknown, rawBody?: string) {
  if (rawBody !== undefined) {
    const request = Readable.from([rawBody]) as IncomingMessage & { body?: unknown };
    request.method = "POST";
    request.headers = {};
    return request;
  }
  return {
    method: "POST",
    headers: {},
    body,
    async *[Symbol.asyncIterator]() {},
  } as unknown as IncomingMessage & { body?: unknown };
}

function createResponse() {
  let rawBody = "";
  const headers = new Map<string, string | string[]>();
  const response = {
    statusCode: 0,
    setHeader(name: string, value: string | string[]) { headers.set(name, value); },
    getHeader(name: string) { return headers.get(name); },
    end(chunk?: string) { rawBody = chunk ?? ""; },
  } as unknown as ServerResponse;
  return {
    response,
    read: () => ({ status: response.statusCode, body: JSON.parse(rawBody) }),
    header: (name: string) => headers.get(name),
  };
}

test("handler confirms an order and returns no PII", async () => {
  const { response, read } = createResponse();
  const handler = createOrderHandler({
    processOrder: async () => ({ orderRef: "ORD-123" }),
  });
  await handler(createRequest(validOrder), response);

  assert.deepEqual(read(), { status: 201, body: { orderRef: "ORD-123", decision: "allow" } });
  assert.equal(JSON.stringify(read()).includes("Test Customer"), false);
  assert.equal(JSON.stringify(read()).includes("01712345678"), false);
});

test("Vercel handler signs client context and issues a device cookie", async () => {
  const previous = process.env.STOREFRONT_CONTEXT_SECRET;
  process.env.STOREFRONT_CONTEXT_SECRET = "test-context-secret-0123456789abcdef";
  try {
    let signed = "";
    const handler = createOrderHandler({ processOrder: async (_order, options) => {
      signed = options?.clientContextHeader ?? "";
      return { orderRef: "ML-3" };
    } });
    const req = createRequest(validOrder);
    req.headers["x-vercel-forwarded-for"] = "103.12.44.7";
    const { response, header } = createResponse();
    await handler(req, response);
    assert.match(signed, /^[\w-]+\.[0-9a-f]{64}$/);
    const context = JSON.parse(Buffer.from(signed.split(".")[0], "base64url").toString());
    assert.equal(context.ip, "103.12.44.7");
    assert.match(context.deviceId, /^[0-9a-f-]{36}$/);
    assert.match(String(header("Set-Cookie")), /mlbd_did=.*HttpOnly; Secure; SameSite=Lax/);
  } finally {
    if (previous === undefined) delete process.env.STOREFRONT_CONTEXT_SECRET;
    else process.env.STOREFRONT_CONTEXT_SECRET = previous;
  }
});

test("handler returns stable client errors and has no side effects for invalid requests", async () => {
  let processCalls = 0;
  const handler = createOrderHandler({
    processOrder: async () => { processCalls += 1; return { orderRef: "never" }; },
  });
  for (const request of [
    createRequest({ ...validOrder, quantity: 0 }),
    createRequest(undefined, "{not-json"),
  ]) {
    const { response, read } = createResponse();
    await handler(request, response);
    assert.equal(read().status, 400);
  }
  assert.equal(processCalls, 0);
});

test("handler rejects an oversized request before order side effects", async () => {
  let processCalls = 0;
  const { response, read } = createResponse();
  const handler = createOrderHandler({
    processOrder: async () => { processCalls += 1; return { orderRef: "never" }; },
  });
  await handler(createRequest(undefined, JSON.stringify({ value: "x".repeat(33 * 1024) })), response);
  assert.equal(read().status, 413);
  assert.equal(processCalls, 0);
});

test("handler maps upstream failures to a stable 502", async () => {
  const { response, read } = createResponse();
  const handler = createOrderHandler({
    processOrder: async () => { throw new OrderUpstreamError(); },
  });
  await handler(createRequest(validOrder), response);
  assert.deepEqual(read(), {
    status: 502,
    body: { message: "Could not confirm order. Please try again." },
  });
});

test("Vercel handler preserves a retryable 429 and ignores malformed telemetry", async () => {
  const { response, read } = createResponse();
  let called = false;
  const handler = createOrderHandler({ processOrder: async (order) => {
    called = true;
    assert.equal(order.checkoutTelemetry, undefined);
    throw new OrderUpstreamError(429);
  } });
  await handler(createRequest({ ...validOrder, checkoutTelemetry: { pastedFields: ["other"] } }), response);
  assert.equal(called, true);
  assert.equal(read().status, 429);
});

test("caps each line at 10 units with a WhatsApp message", () => {
  const withQuantity = (quantity: number) => ({ ...validOrder, items: [{ ...canonicalItems[0], quantity }] });
  assert.equal(validateOrder(withQuantity(10)).items[0].quantity, 10);
  assert.throws(() => validateOrder(withQuantity(100)), { message: MAX_LINE_QUANTITY_MESSAGE });
});

test("an accepted order schedules one server-side Meta Purchase with hashed customer details", async () => {
  const sent: unknown[][] = [];
  const handler = createOrderHandler({
    processOrder: async () => ({ orderRef: "ORD-77" }),
    sendMeta: async (events) => { sent.push(events); return { ok: true }; },
    schedule: () => {},
  });
  const req = createRequest(validOrder);
  req.headers.cookie = "_fbp=fb.1.1.123";
  req.headers.referer = "https://www.serakhabar.com/product/gur";
  const { response, read } = createResponse();
  await handler(req, response);

  assert.equal(read().status, 201);
  assert.equal(sent.length, 1);
  const [event] = sent[0] as Array<Record<string, any>>;
  assert.equal(event.event_name, "Purchase");
  assert.equal(event.event_id, "purchase-ORD-77");
  assert.equal(event.event_source_url, "https://www.serakhabar.com/product/gur");
  assert.equal(event.custom_data.value, 1600);
  assert.equal(event.custom_data.currency, "BDT");
  assert.equal(event.custom_data.order_id, "ORD-77");
  assert.deepEqual(event.custom_data.content_ids, [canonicalItems[0].productId]);
  assert.equal(event.user_data.fbp, "fb.1.1.123");
  assert.match(event.user_data.ph[0], /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(event).includes("01712345678"), false);
  assert.equal(JSON.stringify(event).includes("Test Customer"), false);
});

test("a review hold sends no Meta Purchase", async () => {
  const sent: unknown[] = [];
  const handler = createOrderHandler({
    processOrder: async () => ({ decision: "review", reviewId: "R-1" }),
    sendMeta: async (events) => { sent.push(events); return { ok: true }; },
    schedule: () => {},
  });
  const { response, read } = createResponse();
  await handler(createRequest(validOrder), response);
  assert.equal(read().status, 202);
  assert.equal(sent.length, 0);
});
