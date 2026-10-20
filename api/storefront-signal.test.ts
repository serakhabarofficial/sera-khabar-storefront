import assert from "node:assert/strict";
import test from "node:test";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createSignalHandler } from "./storefront-signal.ts";
import type { MetaServerEvent } from "../server/meta-capi.ts";

function createRequest(body: unknown, method = "POST") {
  return {
    method,
    headers: { host: "www.serakhabar.com", "user-agent": "Mozilla/5.0", "x-forwarded-for": "103.12.44.7" },
    body,
    async *[Symbol.asyncIterator]() {},
  } as unknown as IncomingMessage & { body?: unknown };
}

function createResponse() {
  const headers = new Map<string, unknown>();
  return {
    statusCode: 0,
    setHeader(name: string, value: unknown) { headers.set(name, value); },
    getHeader(name: string) { return headers.get(name); },
    end() {},
  } as unknown as ServerResponse;
}

const pageView = {
  event_name: "PageView",
  event_id: "0b6f3c1e-8f0a-4c9e-9a51-3f3d2f1a7b10",
  event_source_url: "https://www.serakhabar.com/",
};

test("answers 204 at once and schedules the Conversions API send in the background", async () => {
  const sent: MetaServerEvent[][] = [];
  const scheduled: Promise<unknown>[] = [];
  const handler = createSignalHandler({
    send: async (events) => { sent.push(events); return { ok: true }; },
    schedule: (promise) => { scheduled.push(promise); },
  });
  const res = createResponse();
  await handler(createRequest(pageView), res);

  assert.equal(res.statusCode, 204);
  assert.equal(scheduled.length, 1);
  assert.equal(sent[0][0].event_name, "PageView");
  assert.equal(sent[0][0].event_id, pageView.event_id);
  assert.equal(sent[0][0].user_data.client_ip_address, "103.12.44.7");
  assert.equal(sent[0][0].user_data.external_id?.length, 1);
});

test("rejects a browser Purchase, a bad body and non-POST requests without sending", async () => {
  let calls = 0;
  const handler = createSignalHandler({ send: async () => { calls += 1; return { ok: true }; }, schedule: () => {} });
  for (const [body, method, status] of [
    [{ ...pageView, event_name: "Purchase" }, "POST", 400],
    ["not json", "POST", 400],
    [pageView, "GET", 405],
  ] as const) {
    const res = createResponse();
    await handler(createRequest(body, method), res);
    assert.equal(res.statusCode, status);
  }
  assert.equal(calls, 0);
});
