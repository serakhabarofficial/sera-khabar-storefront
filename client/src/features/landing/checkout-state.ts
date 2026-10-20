export type LandingCheckoutStatus = "loading" | "ready" | "error" | "unavailable";

export type LandingFieldName =
  | "pack"
  | "quantity"
  | "name"
  | "phone"
  | "address";

export type LandingFieldErrors = Partial<Record<LandingFieldName, string>>;

export const LANDING_FIELD_ORDER: readonly LandingFieldName[] = [
  "pack",
  "quantity",
  "name",
  "phone",
  "address",
];

export function resolveLandingCheckoutStatus(input: {
  hasProduct: boolean;
  hasOrderablePacks: boolean;
  productIsPending: boolean;
  productIsError: boolean;
  inventoryIsError: boolean;
  inventoryIsFetched: boolean;
  hasInventory: boolean;
}): LandingCheckoutStatus {
  if (input.productIsError) return "error";
  if (input.productIsPending && !input.hasProduct) return "loading";
  if (!input.hasProduct) return "unavailable";
  if (!input.hasOrderablePacks) return "unavailable";

  // A missing inventory payload is an unknown sync state, not proof that a
  // catalog product is sold out. The submit handler revalidates the selected
  // variant against the live inventory feed before creating an order.
  return "ready";
}

export function getFirstLandingInvalidField(errors: LandingFieldErrors) {
  return LANDING_FIELD_ORDER.find((field) => Boolean(errors[field])) ?? null;
}

export function getLandingFocusTargetId(
  errors: LandingFieldErrors,
  selectedVariantId: string,
  renderedVariantIds: string[],
) {
  const firstField = getFirstLandingInvalidField(errors);
  if (!firstField) return null;
  if (firstField !== "pack") return `landing-${firstField}`;

  const targetVariantId = renderedVariantIds.includes(selectedVariantId)
    ? selectedVariantId
    : renderedVariantIds[0];
  return targetVariantId ? `landing-pack-${targetVariantId}` : "landing-pack";
}
