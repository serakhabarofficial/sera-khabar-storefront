import { parseCurrencyAmount, type GoogleAnalyticsItem } from "./google-analytics";

type CartAnalyticsLine = {
  productId: number;
  title: string;
  size: string;
  price: string;
  analyticsItem?: GoogleAnalyticsItem;
};

/** One bag row as a dataLayer item for `quantity` units, using the product's real metadata when the row has it. */
export function cartLineAnalyticsItem(line: CartAnalyticsLine, quantity: number): GoogleAnalyticsItem {
  if (line.analyticsItem) return { ...line.analyticsItem, quantity };
  return {
    item_id: String(line.productId),
    item_name: line.title,
    item_brand: "Sera Khabar",
    item_category: "",
    item_variant: line.size,
    item_list_name: "",
    item_list_id: "",
    price: parseCurrencyAmount(line.price),
    discount: 0,
    index: 0,
    quantity,
  };
}

export function cartItemsValue(items: GoogleAnalyticsItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

/** The event a bag quantity change sends, for the units that changed. */
export function quantityChangeEvent(from: number, to: number) {
  if (to > from) return { event: "add_to_cart" as const, quantity: to - from };
  if (to < from) return { event: "remove_from_cart" as const, quantity: from - to };
  return null;
}
