import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import {
  OrderUpstreamError,
  processOrder,
  orderRequestSchema,
  type OrderRequest,
} from "./order-service.ts";
import { OrderProtectionError, type OrderProcessResult } from "./order-protection-errors.ts";
import { MAX_LINE_QUANTITY_MESSAGE } from "../shared/order-limits.ts";
import { createSignedClientContext } from "./client-context.ts";
import { readOrCreateDeviceId } from "./device-id.ts";
import { readCampaignClickCookie, readCampaignReceipt, type CampaignRedirectOptions } from './campaign-links.js';
import { readAnalyticsSessionCookie } from './analytics-session.js';
import { createGoHandler } from '../api/go.js';
import {
  AbandonedCartUpstreamError,
  AbandonedCartValidationError,
  parseAbandonedCartCapture,
  processAbandonedCartCapture,
} from "./abandoned-cart-service.ts";

type RouteDependencies = {
  processOrder?: (order: OrderRequest, options?: { clientContextHeader?: string; campaignClickId?: string; campaignReceipt?: string; analyticsSessionId?: string }) => Promise<OrderProcessResult>;
  campaignRedirectOptions?: CampaignRedirectOptions;
  processAbandonedCartCapture?: typeof processAbandonedCartCapture;
};

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  dependencies: RouteDependencies = {},
): Promise<Server> {
  const submitOrder = dependencies.processOrder ?? processOrder;
  const processCapture = dependencies.processAbandonedCartCapture ?? processAbandonedCartCapture;
  app.get('/go/:slug', createGoHandler({ ...dependencies.campaignRedirectOptions, local: true }));

  app.post("/api/abandoned-carts", async (req, res, next) => {
    const { deviceId } = readOrCreateDeviceId(req, res);
    try {
      const capture = parseAbandonedCartCapture(req.body);
      const clientContextHeader = createSignedClientContext(req, { deviceId, fingerprint: null, telemetry: {} }, process.env.STOREFRONT_CONTEXT_SECRET);
      const campaignClickId = readCampaignClickCookie(req);
      const campaignReceipt = readCampaignReceipt(req);
      const analyticsSessionId = readAnalyticsSessionCookie(req);
      await processCapture(capture, { ...(clientContextHeader ? { clientContextHeader } : {}), ...(campaignClickId ? { campaignClickId } : {}), ...(campaignReceipt ? { campaignReceipt } : {}),
        ...(analyticsSessionId ? { analyticsSessionId } : {}) });
      res.status(202).json({ ok: true });
    } catch (error) {
      if (error instanceof AbandonedCartValidationError) {
        res.status(400).json({ ok: false, message: "Invalid checkout details" });
        return;
      }
      if (error instanceof AbandonedCartUpstreamError) {
        res.status(502).json({ ok: false, message: "Could not save checkout details. Please continue with your order." });
        return;
      }
      next(error);
    }
  });

  app.post("/api/orders", async (req, res, next) => {
    const { deviceId } = readOrCreateDeviceId(req, res);
    try {
      const order = orderRequestSchema.parse(req.body);
      const clientContextHeader = createSignedClientContext(req, {
        deviceId, fingerprint: order.deviceFingerprint, telemetry: order.checkoutTelemetry,
      }, process.env.STOREFRONT_CONTEXT_SECRET);
      const campaignClickId = readCampaignClickCookie(req);
      const campaignReceipt = readCampaignReceipt(req);
      const analyticsSessionId = readAnalyticsSessionCookie(req);
      const result = await submitOrder(order, { ...(clientContextHeader ? { clientContextHeader } : {}), ...(campaignClickId ? { campaignClickId } : {}), ...(campaignReceipt ? { campaignReceipt } : {}),
        ...(analyticsSessionId ? { analyticsSessionId } : {}) });
      const decision = result.decision ?? "allow";
      const orderRef = "orderRef" in result ? String(result.orderRef ?? "") : "";

      if (decision === "review") {
        res.status(202).json({ decision: "review", reviewId: "reviewId" in result ? result.reviewId : "" });
        return;
      }
      res.status(201).json({ orderRef, decision: "allow" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: error.issues.some((issue) => issue.message === MAX_LINE_QUANTITY_MESSAGE)
            ? MAX_LINE_QUANTITY_MESSAGE
            : "Invalid order details",
        });
        return;
      }

      if (error instanceof OrderUpstreamError) {
        res.status(error.statusCode).json({ message: error.statusCode === 429
          ? "অনেকবার চেষ্টা হয়েছে। একটু পরে আবার চেষ্টা করুন।" : "Could not confirm order. Please try again." });
        return;
      }
      if (error instanceof OrderProtectionError) {
        res.status(error.statusCode).json({ message: error.message, decision: error.decision, retryable: error.retryable });
        return;
      }

      next(error);
    }
  });

  return httpServer;
}
