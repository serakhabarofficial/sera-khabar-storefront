import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";

const testHeaderValue = ["fixture", "token"].join("-");

const validCapture = {
  draftKey: "7cb13b8e-b576-4faa-b238-cc8b73059772",
  source: "storefront",
  sourcePath: "/checkout",
  customerName: "Test Customer",
  phone: "01712345678",
  address: "House 1 Road 2 Dhaka",
  items: [{ productName: "Test Honey", variantName: "500 g", quantity: 1, unitPrice: 750 }],
  subtotal: 750,
  deliveryRate: 100,
  total: 850,
};

function createRequest(body?: unknown, rawBody?: string, method = "POST") {
  if (rawBody !== undefined) {
    const request = Readable.from([rawBody]) as IncomingMessage & { body?: unknown };
    request.method = method;
    request.headers = {};
    return request;
  }
  return {
    method,
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

test("Vercel handler returns a generic non-PII success response after forwarding the capture", async () => {
  const { createAbandonedCartHandler } = await import("./abandoned-carts.ts");
  let forwarded: unknown;
  const handler = createAbandonedCartHandler({
    processCapture: async (capture: unknown) => { forwarded = capture; },
  });
  const { response, read } = createResponse();

  await handler(createRequest(validCapture), response);

  assert.deepEqual(forwarded, { ...validCapture, campaign: {} });
  assert.deepEqual(read(), { status: 202, body: { ok: true } });
  assert.equal(JSON.stringify(read()).includes("Test Customer"), false);
  assert.equal(JSON.stringify(read()).includes("01712345678"), false);
});

test("Vercel forwards only its trusted client IP to the server-side capture processor", async () => {
  const { createAbandonedCartHandler } = await import("./abandoned-carts.ts");
  let forwardedClientIp: unknown;
  const handler = createAbandonedCartHandler({
    processCapture: async (_capture: unknown, context: unknown) => { forwardedClientIp = context; },
  });
  const request = createRequest(validCapture);
  request.headers = { "x-forwarded-for": "203.0.113.42, 10.0.0.1" };
  const { response } = createResponse();

  await handler(request, response);

  assert.deepEqual(forwardedClientIp, { forwardedClientIp: "203.0.113.42" });
});

test("Vercel handler rejects malformed or oversized captures before forwarding", async () => {
  const { createAbandonedCartHandler } = await import("./abandoned-carts.ts");
  let forwarded = 0;
  const handler = createAbandonedCartHandler({
    processCapture: async () => { forwarded += 1; },
  });

  for (const request of [
    createRequest({ ...validCapture, unexpected: true }),
    createRequest(undefined, JSON.stringify({ value: "x".repeat(33 * 1024) })),
  ]) {
    const { response, read } = createResponse();
    await handler(request, response);
    assert.equal(read().body.ok, false);
    assert.equal(JSON.stringify(read()).includes("Test Customer"), false);
  }
  assert.equal(forwarded, 0);
});

test("Vercel handler does not expose an upstream failure or accept another method", async () => {
  const { AbandonedCartUpstreamError, createAbandonedCartHandler } = await import("./abandoned-carts.ts");
  const handler = createAbandonedCartHandler({
    processCapture: async () => { throw new AbandonedCartUpstreamError(); },
  });

  const upstream = createResponse();
  await handler(createRequest(validCapture), upstream.response);
  assert.deepEqual(upstream.read(), {
    status: 502,
    body: { ok: false, message: "Could not save checkout details. Please continue with your order." },
  });

  const method = createResponse();
  await handler(createRequest(validCapture, undefined, "GET"), method.response);
  assert.deepEqual(method.read(), { status: 405, body: { ok: false, message: "Method not allowed" } });
});

test("Vercel capture handler has no runtime dependency on the local Express server", () => {
  const source = readFileSync(new URL("./abandoned-carts.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /from ["']\.\.\/server\/(?:routes|index|abandoned-cart-service)/);
});

test("Vercel capture signs client context with a first-party device cookie", async () => {
  const { createAbandonedCartHandler } = await import("./abandoned-carts.ts");
  const previous = process.env.STOREFRONT_CONTEXT_SECRET;
  process.env.STOREFRONT_CONTEXT_SECRET = "test-context-secret-0123456789abcdef";
  try {
    let options: { clientContextHeader?: string } | undefined;
    const handler = createAbandonedCartHandler({ processCapture: async (_capture, context) => { options = context; } });
    const req = createRequest(validCapture);
    req.headers["x-vercel-forwarded-for"] = "103.12.44.7";
    const { response, header } = createResponse();
    await handler(req, response);
    assert.match(options?.clientContextHeader ?? "", /^[\w-]+\.[0-9a-f]{64}$/);
    const context = JSON.parse(Buffer.from(options!.clientContextHeader!.split(".")[0], "base64url").toString());
    assert.equal(context.ip, "103.12.44.7");
    assert.match(context.deviceId, /^[0-9a-f-]{36}$/);
    assert.match(String(header("Set-Cookie")), /mlbd_did=.*HttpOnly/);
  } finally {
    if (previous === undefined) delete process.env.STOREFRONT_CONTEXT_SECRET;
    else process.env.STOREFRONT_CONTEXT_SECRET = previous;
  }
});

test("Vercel parsing matches the local strict capture contract", async () => {
  const { parseAbandonedCartCapture: parseVercelCapture } = await import("./abandoned-carts.ts");
  const { parseAbandonedCartCapture: parseLocalCapture } = await import("../server/abandoned-cart-service.ts");
  const invalidCaptures = [
    { ...validCapture, unexpected: true },
    { ...validCapture, sourcePath: "/step/honey-nut" },
    { ...validCapture, phone: "0181234567" },
    { ...validCapture, phone: "01212345678" },
    { ...validCapture, phone: "০১৭১২৩৪৫৬৭৮" },
    { ...validCapture, total: 851 },
    { ...validCapture, items: [{ ...validCapture.items[0], quantity: 101 }] },
    { ...validCapture, campaign: { notAllowed: "value" } },
  ];

  const normalizedCapture = {
    ...validCapture,
    customerName: " Test Customer ",
    address: " ",
    campaign: { utmSource: " facebook ", utmMedium: "" },
  };

  assert.deepEqual(parseVercelCapture(normalizedCapture), parseLocalCapture(normalizedCapture));
  // A draft may arrive before the phone is complete, and an empty form only as a returning visit.
  const { phone: _phone, ...withoutPhone } = validCapture;
  const emptyForm = { ...withoutPhone, customerName: undefined, address: undefined };
  for (const capture of [withoutPhone, { ...emptyForm, returningVisit: true }]) {
    assert.deepEqual(parseVercelCapture(capture), parseLocalCapture(capture));
  }
  assert.equal(parseVercelCapture({ ...emptyForm, returningVisit: true }).returningVisit, true);
  invalidCaptures.push(emptyForm, { ...emptyForm, returningVisit: false });
  for (const capture of invalidCaptures) {
    assert.throws(() => parseVercelCapture(capture));
    assert.throws(() => parseLocalCapture(capture));
  }
});

test("Vercel forwards only the validated capture using its server-only API key", async () => {
  const { processAbandonedCartCapture } = await import("./abandoned-carts.ts");
  let requestUrl = "";
  let requestInit: RequestInit | undefined;

  await processAbandonedCartCapture(validCapture, {
    merchantSuiteUrl: "https://suite.invalid",
    apiKey: testHeaderValue,
    forwardedClientIp: "203.0.113.42",
    clientContextHeader: "signed.capture",
    timeoutSignal: () => new AbortController().signal,
    fetchImpl: async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });

  assert.equal(requestUrl, "https://suite.invalid/api/custom-orders/abandoned-checkouts");
  assert.deepEqual(requestInit?.headers, {
    "Content-Type": "application/json",
    "x-api-key": testHeaderValue,
    "x-storefront-client-ip": "203.0.113.42",
    "x-mlbd-client-context": "signed.capture",
  });
  assert.deepEqual(JSON.parse(String(requestInit?.body)), { ...validCapture, campaign: {} });
});
