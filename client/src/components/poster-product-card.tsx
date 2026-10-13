import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

import { formatCardAmount, getVariantLabel, selectDefaultVariant } from "@/components/home-product-card";
import { useCart } from "@/contexts/cart-context";
import { BanglaNumber } from "@/lib/bangla-digits";
import { toGoogleAnalyticsItem } from "@/lib/google-analytics";
import { getProductImageSet, getProductNumericId, type StorefrontProduct } from "@/lib/storefront-products";

// Catalog names are "বাংলা নাম | English Name"; the card shows them on two lines.
export function splitProductName(name: string) {
  const [bangla, english] = name.split("|").map((part) => part.trim());
  return { bangla: bangla || name, english: english ?? "" };
}

type Variant = NonNullable<StorefrontProduct["variants"]>[number];

// Homepage product card from the approved Market Poster design: photo on top (its white
// background blends into the card), centred name, big Atma price, round + button.
// Pass `variant` to sell one specific size; otherwise the card uses the default variant.
export default function PosterProductCard({ product, variant: fixedVariant }: { product: StorefrontProduct; variant?: Variant }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  const { src: image, srcSet } = getProductImageSet(product);
  const { bangla, english } = splitProductName(product.name);
  // Same variant resolution as the shared card and the product page, so the price shown
  // here is the price the product page opens on.
  const variant = fixedVariant ?? selectDefaultVariant(product) ?? product.variants?.[0];
  const variantLabel = getVariantLabel(variant);
  const variantId = variant?.id != null ? String(variant.id) : "";
  const productUuid = product.id != null ? String(product.id) : "";
  const isSoldOut = product.available === false || fixedVariant?.available === false;
  const canAddToCart = !isSoldOut && Boolean(productUuid) && Boolean(variantId);
  const price = Number(variant?.price ?? product.price);
  const compareAtPrice = Number(product.compare_at_price);
  const hasDiscount = Number.isFinite(price) && Number.isFinite(compareAtPrice) && compareAtPrice > price;
  const detail = [variant ? variantLabel : "", english].filter(Boolean).join(" · ");

  return (
    <article className="c-card">
      <Link href={`/product/${product.slug}`} className="c-blob" aria-label={bangla}>
        {image ? (
          <img src={image} srcSet={srcSet} sizes={srcSet ? "170px" : undefined} alt={product.name} loading="lazy" decoding="async" />
        ) : null}
      </Link>
      {isSoldOut ? <span className="c-sold">স্টক শেষ</span> : null}
      <div className="c-info">
        <Link href={`/product/${product.slug}`}>
          <h3>{bangla}</h3>
        </Link>
        {detail ? <small>{detail}</small> : null}
        <div className="c-buy">
          <span className="c-price">
            ৳<BanglaNumber value={Number.isFinite(price) ? price : 0} />
            {hasDiscount ? (
              <s>
                ৳<BanglaNumber value={compareAtPrice} />
              </s>
            ) : null}
          </span>
          <button
            type="button"
            disabled={!canAddToCart}
            aria-label={`${bangla} কার্টে যোগ করুন`}
            className={`add press c-plus${added ? " added" : ""}`}
            onClick={() => {
              addToCart(
                {
                  id: getProductNumericId(product),
                  title: `${product.name} (${variantLabel})`,
                  price: formatCardAmount(price),
                  image,
                  productUuid,
                  variantId,
                  analyticsItem: toGoogleAnalyticsItem({
                    id: product.id ?? product.slug,
                    name: product.name,
                    variant: variantLabel,
                    price,
                    quantity: 1,
                  }),
                },
                variantLabel,
              );
              setAdded(true);
              window.clearTimeout(addedTimer.current);
              addedTimer.current = window.setTimeout(() => setAdded(false), 1600);
            }}
          >
            <span className="l1">+</span>
            <span className="l2">✓</span>
          </button>
        </div>
      </div>
    </article>
  );
}
