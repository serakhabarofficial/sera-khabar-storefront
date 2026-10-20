import { markLandingPurchaseTracked } from "../landing/tracking";

const memoryMarkers = new Map<string, string>();
/** Preserve once-per-order tracking when privacy settings deny storage. */
export function markAmsottoPurchaseTracked(storage: Pick<Storage, "getItem" | "setItem"> | undefined, orderRef: string) {
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
