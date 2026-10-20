import type { StorefrontProduct } from "../../lib/storefront-products.ts";
import { isProductOrderable } from "../../lib/storefront-product-orderability.ts";
import { normalizeBdMobile } from "../../../../shared/bd-phone";
import { MAX_LINE_QUANTITY } from "../../../../shared/order-limits";

export const LANDING_DELIVERY_CHARGE = 0;
export const LANDING_CONFIRMATION_KEY = "kalojira-mixed-order-confirmation-v1";

const MAX_PRICE = 10_000_000;

type LandingConfirmationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type LandingPackOption = {
  variantId: string;
  label: string;
  unitPrice: number;
};

export type LandingOrderTotals = {
  unitPrice: number;
  quantity: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
};

export type LandingOrderPayload = {
  bundleTitle: string;
  bundleDetails: string;
  bundlePrice: number;
  quantity: number;
  deliveryCharge: number;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: "cash_on_delivery";
};

export type LandingOrderConfirmation = {
  orderRef: string;
  /** Catalog product id, so Meta's Purchase content_ids match the server event and the catalog. */
  productId?: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  customerName: string;
  phone: string;
  address: string;
};

function isPositiveSafeInteger(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value > 0
    && value <= max;
}

function requiredTrimmedString(value: unknown, maxLength: number, field: string) {
  if (typeof value !== "string") {
    throw new Error(`${field} is required`);
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    throw new Error(`${field} is invalid`);
  }
  return trimmed;
}

export function getLandingPackOptions(product: StorefrontProduct): LandingPackOption[] {
  if (!isProductOrderable(product)) return [];

  return (product.variants ?? []).flatMap((variant) => {
    if (variant.available === false) return [];
    if (typeof variant.stock_quantity === "number" && variant.stock_quantity <= 0) return [];
    if (variant.id === undefined || variant.id === null) return [];

    const variantId = String(variant.id).trim();
    const size = variant.attributes?.size ?? variant.attributes?.kg;
    const label = typeof size === "string" || typeof size === "number"
      ? String(size).trim()
      : "";
    const unitPrice = typeof variant.price === "number" || typeof variant.price === "string"
      ? Number(variant.price)
      : Number.NaN;

    if (!variantId || !label || !isPositiveSafeInteger(unitPrice, MAX_PRICE)) return [];
    return [{ variantId, label, unitPrice }];
  });
}

export function calculateLandingOrder(unitPrice: number, quantity: number, deliveryCharge = LANDING_DELIVERY_CHARGE): LandingOrderTotals {
  if (!isPositiveSafeInteger(unitPrice, MAX_PRICE)) {
    throw new Error("Unit price is invalid");
  }
  if (!isPositiveSafeInteger(quantity, MAX_LINE_QUANTITY)) {
    throw new Error("Quantity is invalid");
  }

  const subtotal = unitPrice * quantity;
  const total = subtotal + deliveryCharge;
  if (!Number.isSafeInteger(subtotal) || subtotal > MAX_PRICE || !Number.isSafeInteger(total)) {
    throw new Error("Order total is invalid");
  }

  return {
    unitPrice,
    quantity,
    subtotal,
    deliveryCharge,
    total,
  };
}

export function buildLandingAddress(streetAddress: string, district = "", upazila = "") {
  const street = requiredTrimmedString(streetAddress, 300, "Street address");
  const parts = [street];
  const normalizedUpazila = upazila.trim();
  const normalizedDistrict = district.trim();
  if (normalizedUpazila) {
    if (normalizedUpazila.length > 100) throw new Error("Upazila is invalid");
    parts.push(normalizedUpazila);
  }
  if (normalizedDistrict) {
    if (normalizedDistrict.length > 100) throw new Error("District is invalid");
    parts.push(normalizedDistrict);
  }
  const address = parts.join(", ");
  if (address.length > 500) throw new Error("Address is invalid");
  return address;
}

export function buildLandingOrderPayload(input: {
  productName: string;
  pack: LandingPackOption;
  quantity: number;
  customerName: string;
  phone: string;
  address: string;
  deliveryCharge?: number;
}): LandingOrderPayload {
  const totals = calculateLandingOrder(input.pack.unitPrice, input.quantity, input.deliveryCharge);
  const customerName = requiredTrimmedString(input.customerName, 120, "Customer name");
  const phone = normalizeBdMobile(input.phone);
  const address = requiredTrimmedString(input.address, 500, "Address");
  if (customerName.length < 2
    || !phone
    || address.length < 5
    || address.split(/\s+/).filter(Boolean).length < 3) {
    throw new Error("Customer details are invalid");
  }

  return {
    bundleTitle: requiredTrimmedString(input.productName, 200, "Product name"),
    bundleDetails: requiredTrimmedString(input.pack.label, 300, "Pack label"),
    bundlePrice: totals.subtotal,
    quantity: totals.quantity,
    deliveryCharge: totals.deliveryCharge,
    customerName,
    phone,
    address,
    paymentMethod: "cash_on_delivery",
  };
}

export function buildLandingOrderConfirmation(
  orderRef: string,
  payload: LandingOrderPayload & { items?: Array<{ productId: string }> },
): LandingOrderConfirmation {
  const totals = calculateLandingOrder(payload.bundlePrice / payload.quantity, payload.quantity, payload.deliveryCharge);
  const productId = payload.items?.[0]?.productId.trim();
  return {
    orderRef: requiredTrimmedString(orderRef, 128, "Order reference"),
    ...(productId ? { productId } : {}),
    productName: requiredTrimmedString(payload.bundleTitle, 200, "Product name"),
    variantLabel: requiredTrimmedString(payload.bundleDetails, 300, "Pack label"),
    ...totals,
    customerName: requiredTrimmedString(payload.customerName, 120, "Customer name"),
    phone: requiredTrimmedString(payload.phone, 11, "Phone"),
    address: requiredTrimmedString(payload.address, 500, "Address"),
  };
}

function parseLandingOrderConfirmation(value: unknown): LandingOrderConfirmation | null {
  if (!value || typeof value !== "object") return null;
  const confirmation = value as Record<string, unknown>;

  try {
    const orderRef = requiredTrimmedString(confirmation.orderRef, 128, "Order reference");
    const productId = typeof confirmation.productId === "string" && confirmation.productId.trim()
      ? requiredTrimmedString(confirmation.productId, 120, "Product id") : undefined;
    const productName = requiredTrimmedString(confirmation.productName, 200, "Product name");
    const variantLabel = requiredTrimmedString(confirmation.variantLabel, 300, "Pack label");
    const quantity = confirmation.quantity;
    const unitPrice = confirmation.unitPrice;
    const subtotal = confirmation.subtotal;
    const deliveryCharge = confirmation.deliveryCharge;
    const total = confirmation.total;
    const customerName = requiredTrimmedString(confirmation.customerName, 120, "Customer name");
    const phone = requiredTrimmedString(confirmation.phone, 11, "Phone");
    const address = requiredTrimmedString(confirmation.address, 500, "Address");

    if (!isPositiveSafeInteger(quantity, MAX_LINE_QUANTITY)
      || !isPositiveSafeInteger(unitPrice, MAX_PRICE)
      || !Number.isSafeInteger(subtotal) || (subtotal as number) < 0
      || !Number.isSafeInteger(deliveryCharge) || (deliveryCharge as number) < 0
      || !Number.isSafeInteger(total) || (total as number) < 0
      || subtotal !== unitPrice * quantity
      || total !== (subtotal as number) + (deliveryCharge as number)) {
      return null;
    }

    return {
      orderRef,
      ...(productId ? { productId } : {}),
      productName,
      variantLabel,
      quantity,
      unitPrice,
      subtotal: subtotal as number,
      deliveryCharge: deliveryCharge as number,
      total: total as number,
      customerName,
      phone,
      address,
    };
  } catch {
    return null;
  }
}

export function writeLandingOrderConfirmation(
  storage: LandingConfirmationStorage | undefined,
  confirmation: LandingOrderConfirmation,
) {
  if (!storage) return false;
  const safeConfirmation = parseLandingOrderConfirmation(confirmation);
  if (!safeConfirmation) return false;

  try {
    storage.setItem(LANDING_CONFIRMATION_KEY, JSON.stringify(safeConfirmation));
    return true;
  } catch {
    return false;
  }
}

export function readLandingOrderConfirmation(storage: LandingConfirmationStorage | undefined) {
  if (!storage) return null;
  try {
    const serialized = storage.getItem(LANDING_CONFIRMATION_KEY);
    return serialized ? parseLandingOrderConfirmation(JSON.parse(serialized)) : null;
  } catch {
    return null;
  }
}

export function clearLandingOrderConfirmation(storage: LandingConfirmationStorage | undefined) {
  try {
    storage?.removeItem(LANDING_CONFIRMATION_KEY);
  } catch {
    // Storage can be unavailable in privacy modes. Clearing remains best-effort.
  }
}
