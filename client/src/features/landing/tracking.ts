const LANDING_PURCHASE_MARKER_PREFIX = "kalojira-mixed-purchase-tracked-v1:";

type LandingTrackingStorage = Pick<Storage, "getItem" | "setItem">;

export function markLandingPurchaseTracked(
  storage: LandingTrackingStorage | undefined,
  orderRef: string,
) {
  const normalizedOrderRef = orderRef.trim();
  if (!storage || !normalizedOrderRef) return false;

  const marker = `${LANDING_PURCHASE_MARKER_PREFIX}${normalizedOrderRef}`;
  try {
    if (storage.getItem(marker) !== null) return false;
    storage.setItem(marker, "1");
    return true;
  } catch {
    return false;
  }
}
