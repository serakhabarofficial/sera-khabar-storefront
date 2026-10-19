import { motion } from "framer-motion";
import { Link } from "wouter";

import { useAddToCart } from "@/contexts/cart-context";
import { toGoogleAnalyticsItem } from "@/lib/google-analytics";
import { getDefaultBundleIndex } from "@/lib/product-selection";
import {
  getProductImageSet,
  getProductNumericId,
  type StorefrontProduct,
} from "@/lib/storefront-products";

// Two columns on phones, three from md, four from lg — matches the grids this
// card is rendered in so the browser can pick the smallest sufficient variant.
const CARD_IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

type HomeProductCardProps = {
  product: StorefrontProduct;
  className?: string;
};

const transition = { duration: 1, ease: [0.25, 0.1, 0.25, 1] as const };
const reveal = {
  hidden: { filter: "blur(2px)", transform: "translateY(20%)", opacity: 0 },
  visible: { filter: "blur(0)", transform: "translateY(0)", opacity: 1 },
};

export function formatCardAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `৳${amount.toLocaleString("en-US")}` : "৳0";
}

export function isVariantInStock(variant: NonNullable<StorefrontProduct["variants"]>[number]) {
  if (variant.available === false) return false;
  return typeof variant.stock_quantity !== "number" || variant.stock_quantity > 0;
}

// Same label the product page shows for a variant, so a card add and a product
// page add of the same variant collapse into one cart row.
export function getVariantLabel(variant: NonNullable<StorefrontProduct["variants"]>[number] | undefined) {
  if (!variant) return "Default";
  return String(variant.attributes?.size ?? Object.values(variant.attributes ?? {})[0] ?? "Default");
}

// The variant the product page preselects: in-stock options in catalog order,
// then the per-slug preference. Sharing getDefaultBundleIndex keeps the card
// price and the product page's opening price from drifting apart.
export function selectDefaultVariant(product: StorefrontProduct) {
  const inStock = product.variants?.filter(isVariantInStock) ?? [];
  if (!inStock.length) return undefined;
  return inStock[getDefaultBundleIndex(product.slug, inStock.map((variant) => ({ title: getVariantLabel(variant) })))];
}

export default function HomeProductCard({ product, className = "" }: HomeProductCardProps) {
  const addToCart = useAddToCart();
  const { src: image, srcSet: imageSrcSet } = getProductImageSet(product);
  // The card sells whichever variant it prices, so one variant drives both.
  // It resolves that variant exactly as the product page does — in-stock
  // options only, then the per-slug default — so the price on the card is the
  // price the product page opens on. Falls back to the first variant so a
  // fully sold-out product still renders a price.
  const firstVariant = selectDefaultVariant(product) ?? product.variants?.[0];
  const variantLabel = getVariantLabel(firstVariant);
  const variantId = firstVariant?.id != null ? String(firstVariant.id) : "";
  const productUuid = product.id != null ? String(product.id) : "";
  // Checkout posts product + variant ids to the Suite, which rejects an order
  // without them. No ids means no sale, so don't offer the button.
  const canAddToCart = product.available !== false && Boolean(productUuid) && Boolean(variantId);
  const currentPrice = Number(firstVariant?.price ?? product.price);
  const compareAtPrice = Number(product.compare_at_price);
  const hasDiscount = Number.isFinite(currentPrice) && Number.isFinite(compareAtPrice) && compareAtPrice > currentPrice;

  return (
    <motion.article
      variants={reveal}
      transition={transition}
      className={`group flex min-w-0 flex-col ${className}`}
    >
      <Link href={`/product/${product.slug}`} className="block flex-1">
        <div className="relative aspect-[3/4] overflow-hidden bg-white">
          {image ? (
            <img
              src={image}
              srcSet={imageSrcSet}
              sizes={imageSrcSet ? CARD_IMAGE_SIZES : undefined}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain object-center mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.3em] text-black/30">
              No image
            </div>
          )}
          {product.available === false && (
            <span className="absolute left-4 top-4 bg-neutral-500/70 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-white">
              Sold out
            </span>
          )}
        </div>

        <div className="space-y-2 pl-0 pr-0 pb-4 pt-3 md:pl-0 md:pr-0 md:pb-5">
          <h3 className="line-clamp-1 min-h-[1.2em] text-sm font-bold uppercase leading-tight tracking-[0.06em] md:min-h-[1.2em] md:text-base md:tracking-[0.08em]">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-nowrap items-center gap-x-1">
            <span className="shrink-0 text-lg font-bold text-[#f26b4f] md:text-2xl">
              {formatCardAmount(currentPrice)}
            </span>
            {hasDiscount ? (
              <span className="shrink-0 text-sm text-black/75 line-through md:text-base">
                {formatCardAmount(compareAtPrice)}
              </span>
            ) : null}
            {hasDiscount ? (
              <span className="ml-1 inline-flex shrink-0 whitespace-nowrap rounded-full bg-[#FBBB14]/35 px-2.5 py-1 text-[10px] font-medium text-black">
                Save {formatCardAmount(compareAtPrice - currentPrice)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <button
        type="button"
        disabled={!canAddToCart}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          addToCart(
            {
              id: getProductNumericId(product),
              title: `${product.name} (${variantLabel})`,
              price: formatCardAmount(currentPrice),
              image,
              productUuid,
              variantId,
              analyticsItem: toGoogleAnalyticsItem({
                id: product.id ?? product.slug,
                name: product.name,
                variant: variantLabel,
                price: currentPrice,
                quantity: 1,
              }),
            },
            variantLabel,
          );
        }}
        className="mt-auto w-full border border-black/15 bg-[#FBBB14] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add to Cart
      </button>
    </motion.article>
  );
}
