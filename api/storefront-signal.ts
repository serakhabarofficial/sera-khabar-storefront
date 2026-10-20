import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil } from "@vercel/functions";
import { buildBrowserServerEvent, parseBrowserMetaEvent, sendMetaEvents } from "../server/meta-capi.js";
import { readOrCreateDeviceId } from "../server/device-id.js";

const MAX_REQUEST_BYTES = 16 * 1024;

type SignalHandlerDependencies = {
  send?: typeof sendMetaEvents;
  /** Keeps the Meta call alive after the 204; Vercel's waitUntil in production. */
  schedule?: (promise: Promise<unknown>) => void;
};

async function readJsonBody(req: IncomingMessage & { body?: unknown }) {
  if (req.body !== undefined) {
    if (typeof req.body !== "string") return req.body;
    if (req.body.length > MAX_REQUEST_BYTES) return null;
    try { return JSON.parse(req.body); } catch { return null; }
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BYTES) return null;
    chunks.push(buffer);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
}

/**
 * Server half of the Meta Pixel: the page posts each browser event here with the Pixel's event_id, and
 * this forwards it to the Conversions API with the visitor's IP, browser and Meta cookies. It answers
 * at once and sends in the background, so the page never waits on Meta.
 */
export function createSignalHandler(dependencies: SignalHandlerDependencies = {}) {
  const send = dependencies.send ?? sendMetaEvents;
  const schedule = dependencies.schedule ?? waitUntil;

  return async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end();
      return;
    }
    const host = [req.headers["x-forwarded-host"]].flat()[0] ?? req.headers.host;
    const event = parseBrowserMetaEvent(await readJsonBody(req), host);
    if (!event) {
      res.statusCode = 400;
      res.end();
      return;
    }
    const { deviceId } = readOrCreateDeviceId(req, res);
    schedule(send([buildBrowserServerEvent(event, req.headers, deviceId)]));
    res.statusCode = 204;
    res.end();
  };
}

export default createSignalHandler();
