import { markLandingPurchaseTracked } from "../landing/tracking";
import { GUR_CONFIRMATION_KEY } from "./content";

export type GurOrderLine = { productId: string; productName: string; variantLabel: string; quantity: number; unitPrice: number };
export type GurOrderConfirmation = {
  orderRef: string;
  items: GurOrderLine[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  customerName: string;
  phone: string;
  address: string;
};

type ConfirmationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const isCount = (v: unknown, max = 10_000_000): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;

/** Storage is visitor-controlled, so anything read back is re-validated before the receipt uses it. */
export function parseGurConfirmation(value: unknown): GurOrderConfirmation | null {
  if (!value || typeof value !== "object") return null;
  const c = value as Record<string, unknown>;
  if (!isText(c.orderRef, 120) || !isText(c.customerName, 120) || !isText(c.phone, 20) || !isText(c.address, 500)) return null;
  if (!isCount(c.subtotal) || !isCount(c.deliveryCharge) || !isCount(c.total) || c.total !== c.subtotal + c.deliveryCharge) return null;
  if (!Array.isArray(c.items) || c.items.length < 1 || c.items.length > 50) return null;
  const items: GurOrderLine[] = [];
  for (const raw of c.items) {
    const line = raw as Record<string, unknown>;
    if (!line || !isText(line.productId, 120) || !isText(line.productName, 200) || !isText(line.variantLabel, 100) || !isCount(line.quantity, 100) || !isCount(line.unitPrice)) return null;
    items.push({ productId: line.productId, productName: line.productName, variantLabel: line.variantLabel, quantity: line.quantity, unitPrice: line.unitPrice });
  }
  if (items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) !== c.subtotal) return null;
  return { orderRef: c.orderRef, items, subtotal: c.subtotal, deliveryCharge: c.deliveryCharge, total: c.total, customerName: c.customerName, phone: c.phone, address: c.address };
}

// A successful order must still show its receipt when privacy settings deny sessionStorage.
// Memory lives only for this SPA session; it is cleared on the thank-you page just like storage.
let memory: GurOrderConfirmation | null = null;
export function gurSessionStorage(): ConfirmationStorage | undefined {
  try { return window.sessionStorage; } catch { return undefined; }
}
export function saveGurConfirmation(confirmation: GurOrderConfirmation, storage = gurSessionStorage()) {
  memory = confirmation;
  try { storage?.setItem(GUR_CONFIRMATION_KEY, JSON.stringify(confirmation)); } catch { /* Memory still carries the receipt. */ }
}
export function readGurConfirmation(storage = gurSessionStorage()) {
  try {
    const stored = storage?.getItem(GUR_CONFIRMATION_KEY);
    if (stored) return parseGurConfirmation(JSON.parse(stored)) ?? memory;
  } catch { /* Fall back to memory. */ }
  return memory;
}
export function clearGurConfirmation(storage = gurSessionStorage()) {
  memory = null;
  try { storage?.removeItem(GUR_CONFIRMATION_KEY); } catch { /* Clearing remains best-effort. */ }
}

const memoryMarkers = new Map<string, string>();
/** Preserve once-per-order tracking when privacy settings deny storage. */
export function markGurPurchaseTracked(storage: Pick<Storage, "getItem" | "setItem"> | undefined, orderRef: string) {
  return markLandingPurchaseTracked({
    getItem(key) {
      try { return storage?.getItem(key) ?? memoryMarkers.get(key) ?? null; }
      catch { return memoryMarkers.get(key) ?? null; }
    },
    setItem(key, value) {
      memoryMarkers.set(key, value);
      try { storage?.setItem(key, value); } catch { /* Memory still deduplicates the event. */ }
    },
  }, orderRef);
}
