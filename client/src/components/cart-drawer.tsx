import { useCart, type AddToCartProduct, type CartItem } from "@/contexts/cart-context";
import { Minus, Plus, Trash2, Truck, X } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Drawer } from "vaul";
import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import OrderDialog, { type OrderDialogBundle } from "@/components/order-dialog";
import { BagIcon } from "@/components/bag-icon";
import { formatCardAmount, getVariantLabel, isVariantInStock, selectDefaultVariant } from "@/components/home-product-card";
import { parseCurrencyAmount, toGoogleAnalyticsItem } from "@/lib/google-analytics";
import { bundleHasFreeDeliveryProduct } from "@/lib/free-delivery";
import { parsePackGrams } from "@/lib/product-sizes";
import { POLICY_FACTS } from "@/lib/site-pages";
import { generatedStorefrontProducts } from "@/lib/generated-storefront-products";
import {
    fetchStorefrontProducts,
    getProductImageSet,
    getProductNumericId,
    STOREFRONT_CATALOG_QUERY_OPTIONS,
    type StorefrontProduct,
} from "@/lib/storefront-products";
import { MAX_LINE_QUANTITY } from "@shared/order-limits";

// Cart redesign (approved 2026-10-20, docs/design/2026-10-20-cart/cart-variants.html, "ঘর × রেফারেন্স — English"):
// English copy, a free-delivery milestone, a size picker on every row, an "Add to your order" rail.

const cartEase = [0.23, 1, 0.32, 1] as const;
// Only transform and opacity animate (Emil Kowalski's rule): animating height or width re-lays-out the whole
// sheet every frame, which Chrome on iOS can't keep up with (measured 2026-10-20: ~70 layouts per add/remove).
// Rows and rail cards use AnimatePresence's popLayout: a leaving item is lifted out of the flow at once, and its
// neighbours slide into the gap with a layout (FLIP) animation — one measurement, then transforms only.
const slide = { duration: 0.34, ease: [0.4, 0, 0.2, 1] } as const;
const rowMotion = {
    layout: "position" as const,
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { opacity: { duration: 0.26, delay: 0.08, ease: cartEase }, y: { duration: 0.34, delay: 0.08, ease: cartEase } } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.18, ease: cartEase } },
    transition: { layout: slide },
};
const RAIL_GAP = 10;
const cardMotion = {
    layout: "position" as const,
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.28, delay: 0.1, ease: cartEase } },
    exit: { opacity: 0, scale: 0.94, transition: { duration: 0.2, ease: cartEase } },
    transition: { layout: slide },
};
// The "Add to your order" block only comes and goes when the catalog runs out of add-ons: a plain fade.
const sectionFade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.24, ease: cartEase } },
    exit: { opacity: 0, transition: { duration: 0.16, ease: cartEase } },
};
// The Add label slides to "✓ Added" first; the card leaves after it, so the tap reads as cause, then effect.
const ADD_CONFIRM_MS = 380;
const MAX_SUGGESTIONS = 6;
// Bag rows and rail cards request the same photo size, so a product added from the rail reuses the decoded image.
const THUMB_SIZES = "160px";

const cartPanelVariants: Variants = {
    closed: { opacity: 0 },
    open: {
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: cartEase,
            staggerChildren: 0.05,
            delayChildren: 0.06,
        },
    },
};

const cartSectionVariants: Variants = {
    closed: { opacity: 0, y: 16 },
    open: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: cartEase },
    },
};

const formatAmount = (amount: number) => `৳${amount.toLocaleString("en-IN")}`;

// Catalog names are "বাংলা নাম | English Name"; the cart leads with the English name and keeps the Bangla one beneath.
function splitName(name: string) {
    const [bangla, english] = name.split("|").map((part) => part.trim());
    return english ? { english, bangla } : { english: bangla || name, bangla: "" };
}

// Cart titles are "Bangla name | English Name (size)".
function getCartItemNames(item: { title: string; size: string }) {
    return splitName(item.title.replace(` (${item.size})`, ""));
}

// "৫০০ গ্রাম" → "500 g", "১ কেজি" → "1 kg"; anything unparseable is shown as the catalog wrote it.
function englishSize(label: string) {
    if (label === "Default") return "";
    const grams = parsePackGrams(label);
    if (!grams) return label;
    return grams >= 1000 ? `${Number((grams / 1000).toFixed(2))} kg` : `${grams} g`;
}

function getItemAmount(item: CartItem) {
    const price = parseFloat(item.price.replace(/[^0-9]/g, ''));
    return Number.isNaN(price) ? 0 : price;
}

type Variant = NonNullable<StorefrontProduct["variants"]>[number];

type SizeOption = { variant: Variant; label: string; amount: number };

// Sizes a bag row can switch to: the product's in-stock variants, priced like the product page.
function getSizeOptions(product: StorefrontProduct | undefined): SizeOption[] {
    if (!product?.variants?.length) return [];
    return product.variants
        .filter((variant) => variant.id != null && isVariantInStock(variant))
        .map((variant) => ({ variant, label: getVariantLabel(variant), amount: Number(variant.price ?? product.price) || 0 }));
}

function toCartProduct(product: StorefrontProduct, option: SizeOption): AddToCartProduct {
    return {
        id: getProductNumericId(product),
        title: `${product.name} (${option.label})`,
        price: formatCardAmount(option.amount),
        image: getProductImageSet(product).src,
        productUuid: String(product.id),
        variantId: String(option.variant.id),
        analyticsItem: toGoogleAnalyticsItem({
            id: product.id ?? product.slug,
            name: product.name,
            variant: option.label,
            price: option.amount,
            quantity: 1,
        }),
    };
}

// The double-size pack, when two of the current pack cost more than one of it (two 500 g → one 1 kg).
function getUpgrade(item: CartItem, options: SizeOption[]) {
    if (item.quantity < 2) return null;
    const grams = parsePackGrams(item.size);
    const unit = getItemAmount(item);
    if (!grams || !unit) return null;
    const bigger = options.find((option) => parsePackGrams(option.label) === grams * 2);
    if (!bigger || bigger.amount >= unit * 2) return null;
    return { option: bigger, saving: (unit * 2 - bigger.amount) * Math.floor(item.quantity / 2) };
}

type Suggestion = {
    product: StorefrontProduct;
    productUuid: string;
    variantId: string;
    variantLabel: string;
    name: string;
    amount: number;
    image: string;
    srcSet?: string;
};

// Products the shopper can add in one tap: in stock, sellable (both checkout ids
// known) and not already in the bag. Adding one moves it from the rail into the bag.
function buildSuggestions(catalog: StorefrontProduct[], items: CartItem[]) {
    const inCart = new Set(items.map((item) => item.productUuid));
    const suggestions: Suggestion[] = [];
    for (const product of catalog) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;
        const variant = selectDefaultVariant(product);
        const productUuid = product.id != null ? String(product.id) : "";
        const variantId = variant?.id != null ? String(variant.id) : "";
        if (product.available === false || !productUuid || !variantId) continue;
        if (inCart.has(productUuid)) continue;
        const { src, srcSet } = getProductImageSet(product);
        suggestions.push({
            product,
            productUuid,
            variantId,
            variantLabel: getVariantLabel(variant),
            name: splitName(product.name).english,
            amount: Number(variant?.price ?? product.price) || 0,
            image: src,
            srcSet,
        });
    }
    return suggestions;
}

// Rail cards are sized so desktop shows three and phones show two with the next one peeking in.
function getTileWidth(isMobile: boolean) {
    if (typeof window === "undefined") return 132;
    if (isMobile) return Math.round((window.innerWidth - 40) * 0.44);
    const panel = Math.min(460, window.innerWidth - 32);
    return Math.floor((panel - 52 - RAIL_GAP * 2) / 3);
}

// Remembers the previous render's value, so a changed count or total can play its short blur swap.
function useChanged<T>(value: T) {
    const previous = useRef(value);
    const changed = previous.current !== value;
    useEffect(() => {
        previous.current = value;
    }, [value]);
    return changed;
}

type CartInnerContentProps = {
    items: CartItem[];
    isOpen: boolean;
    isMobile: boolean;
    setIsOpen: (open: boolean) => void;
    removeFromCart: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    changeSize: (item: CartItem, option: SizeOption, quantity: number, keep?: number) => void;
    sizeOptionsFor: (item: CartItem) => SizeOption[];
    itemCount: number;
    subtotal: number;
    total: number;
    freeDeliveryLeft: number;
    freeDeliveryProgress: number;
    suggestions: Suggestion[];
    stampedSuggestion: string | null;
    addSuggestion: (suggestion: Suggestion) => void;
    openCheckout: () => void;
    thumbSrcSets: Map<string, string>;
};

function CartInnerContent({
    items,
    isOpen,
    isMobile,
    setIsOpen,
    removeFromCart,
    updateQuantity,
    changeSize,
    sizeOptionsFor,
    itemCount,
    subtotal,
    total,
    freeDeliveryLeft,
    freeDeliveryProgress,
    suggestions,
    stampedSuggestion,
    addSuggestion,
    openCheckout,
    thumbSrcSets,
}: CartInnerContentProps) {
    const bodyRef = useRef<HTMLDivElement>(null);
    const milestoneRef = useRef<HTMLDivElement>(null);
    // Once the milestone scrolls under the header, a 2px line on the header's edge carries the same progress.
    const [pastMilestone, setPastMilestone] = useState(false);
    useEffect(() => {
        const body = bodyRef.current;
        const milestone = milestoneRef.current;
        if (!isOpen || !body || !milestone || typeof IntersectionObserver === "undefined") {
            setPastMilestone(false);
            return;
        }
        const observer = new IntersectionObserver(([entry]) => setPastMilestone(!entry.isIntersecting), { root: body });
        observer.observe(milestone);
        return () => observer.disconnect();
    }, [isOpen, items.length > 0]);

    // Rail cards that were tapped: their label shows "✓ Added" before they fold away.
    const [confirming, setConfirming] = useState<Set<string>>(() => new Set());
    const timers = useRef<number[]>([]);
    useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
    // A tapped control that is about to disappear hands focus to the bag body first (without scrolling), so the
    // drawer's focus trap doesn't force a layout and a scroll in the animation's first frame.
    const parkFocus = () => bodyRef.current?.focus({ preventScroll: true });
    const removeRow = (item: CartItem) => {
        parkFocus();
        removeFromCart(item.id);
    };
    const confirmAdd = (suggestion: Suggestion) => {
        if (confirming.has(suggestion.productUuid)) return;
        setConfirming((current) => new Set(current).add(suggestion.productUuid));
        timers.current.push(window.setTimeout(() => {
            parkFocus();
            addSuggestion(suggestion);
            setConfirming((current) => {
                const next = new Set(current);
                next.delete(suggestion.productUuid);
                return next;
            });
        }, ADD_CONFIRM_MS));
    };

    const [tileWidth, setTileWidth] = useState(() => getTileWidth(isMobile));
    useEffect(() => {
        const measure = () => setTileWidth(getTileWidth(isMobile));
        measure();
        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [isMobile]);

    const countChanged = useChanged(itemCount);
    const totalChanged = useChanged(total);

    // Rows are keyed by product, not by size, so switching a row's size updates it in place instead of
    // folding one row out and another in. Two sizes of one product get their own keys by position.
    const seen = new Map<string, number>();
    const rowKeys = items.map((item) => {
        const n = seen.get(item.productUuid) ?? 0;
        seen.set(item.productUuid, n + 1);
        return `${item.productUuid}:${n}`;
    });

    return (
        <div className="skc">
            <motion.div
                variants={cartPanelVariants}
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                className="skc-inner"
            >
                <motion.div variants={cartSectionVariants} className="skc-head">
                    <h2 className="skc-title">
                        Bag
                        {itemCount > 0 && <sup key={itemCount} className={countChanged ? "skc-tick" : undefined}>{itemCount}</sup>}
                    </h2>
                    <button type="button" onClick={() => setIsOpen(false)} aria-label="Close bag" className="skc-close">
                        <X className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    {items.length > 0 && (
                        <span className={`skc-mini${pastMilestone ? " on" : ""}`} aria-hidden="true">
                            <motion.i animate={{ scaleX: freeDeliveryProgress }} transition={{ duration: 0.6, ease: cartEase }} style={{ originX: 0 }} />
                        </span>
                    )}
                </motion.div>

                <motion.div variants={cartSectionVariants} className="skc-body" ref={bodyRef} tabIndex={-1} layoutScroll>
                    {items.length === 0 ? (
                        <div className="skc-empty">
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M5 8h14l-1 12H6z" />
                                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                            </svg>
                            <h3>Your bag is empty</h3>
                            <p>This winter's date palm jaggery is here.</p>
                            <button type="button" onClick={() => setIsOpen(false)} className="skc-browse">
                                Continue shopping
                            </button>
                        </div>
                    ) : (
                        <>
                            <div ref={milestoneRef} className={`skc-ms${freeDeliveryLeft > 0 ? "" : " done"}`}>
                                <p>
                                    {freeDeliveryLeft > 0
                                        ? <>Add <b>{formatAmount(freeDeliveryLeft)}</b> more for <b>free delivery</b></>
                                        : <>You've unlocked <b className="skc-leaf">free delivery</b></>}
                                </p>
                                <div className="skc-ms-track">
                                    <motion.i
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: freeDeliveryProgress }}
                                        transition={{ duration: 0.6, ease: cartEase }}
                                        style={{ originX: 0 }}
                                    />
                                    <span className="skc-ms-node"><Truck aria-hidden="true" /></span>
                                </div>
                                <div className="skc-ms-lab">
                                    <span>{formatAmount(subtotal)}</span>
                                    <span>{formatAmount(POLICY_FACTS.freeDeliveryThreshold)}</span>
                                </div>
                            </div>

                            <ul className="skc-list">
                                <AnimatePresence initial={false} mode="popLayout">
                                    {items.map((item, index) => {
                                        const { english, bangla } = getCartItemNames(item);
                                        const amount = getItemAmount(item);
                                        const options = sizeOptionsFor(item);
                                        const upgrade = getUpgrade(item, options);
                                        const sizeText = englishSize(item.size);
                                        return (
                                            <motion.li key={rowKeys[index]} {...rowMotion} className="skc-item">
                                                <div className="skc-row">
                                                    <div className="skc-img">
                                                        {/* The thumbnail takes the small size, not the full photo, so a new row doesn't download and decode 960px mid-animation. */}
                                                        <img src={item.image} srcSet={thumbSrcSets.get(item.image)} sizes={thumbSrcSets.has(item.image) ? THUMB_SIZES : undefined} alt="" decoding="async" />
                                                    </div>
                                                    <div className="skc-info">
                                                        <div className="skc-top">
                                                            <h3>{english}</h3>
                                                            <span className="skc-price">{formatAmount(amount * item.quantity)}</span>
                                                        </div>
                                                        {bangla && <div className="skc-bn">{bangla}</div>}
                                                        {options.length > 1 ? (
                                                            <label className="skc-size">
                                                                <select
                                                                    value={item.size}
                                                                    aria-label={`${english} size`}
                                                                    onChange={(event) => {
                                                                        const option = options.find((candidate) => candidate.label === event.target.value);
                                                                        if (option) changeSize(item, option, item.quantity);
                                                                    }}
                                                                >
                                                                    {!options.some((option) => option.label === item.size) && <option value={item.size}>{sizeText || item.size}</option>}
                                                                    {options.map((option) => (
                                                                        <option key={option.label} value={option.label}>{englishSize(option.label) || option.label}</option>
                                                                    ))}
                                                                </select>
                                                            </label>
                                                        ) : sizeText ? (
                                                            <span className="skc-size one">{sizeText}</span>
                                                        ) : null}
                                                        <p className="skc-note">
                                                            {upgrade ? (
                                                                <>
                                                                    Save {formatAmount(upgrade.saving)} with the {englishSize(upgrade.option.label)} pack ·{" "}
                                                                    <button type="button" onClick={() => changeSize(item, upgrade.option, Math.floor(item.quantity / 2), item.quantity % 2)}>Switch</button>
                                                                </>
                                                            ) : (
                                                                <>{formatAmount(amount)} each</>
                                                            )}
                                                        </p>
                                                        <div className="skc-ctl">
                                                            <div className="skc-qty">
                                                                <button type="button" aria-label={`One less ${english}`} onClick={() => (item.quantity === 1 ? removeRow(item) : updateQuantity(item.id, item.quantity - 1))}>
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <span>{item.quantity}</span>
                                                                <button type="button" aria-label={`One more ${english}`} disabled={item.quantity >= MAX_LINE_QUANTITY} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            <button type="button" onClick={() => removeRow(item)} aria-label={`Remove ${english}`} className="skc-remove">
                                                                <Trash2 aria-hidden="true" />
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.li>
                                        );
                                    })}
                                </AnimatePresence>
                            </ul>

                            <AnimatePresence initial={false}>
                                {suggestions.length > 0 && (
                                    <motion.div key="skc-add" {...sectionFade} className="skc-add-fold">
                                        <section className="skc-add" aria-labelledby="skc-add-title">
                                            <div className="skc-add-head">
                                                <h4 id="skc-add-title">Add to your order</h4>
                                                <span>Ships in the same box</span>
                                            </div>
                                            {/* data-vaul-no-drag: sideways scrolling must not drag the drawer shut */}
                                            <motion.ul className="skc-rail" data-vaul-no-drag layoutScroll>
                                                <AnimatePresence initial={false} mode="popLayout">
                                                    {suggestions.map((suggestion) => {
                                                        const added = confirming.has(suggestion.productUuid);
                                                        const size = englishSize(suggestion.variantLabel);
                                                        return (
                                                            <motion.li key={suggestion.productUuid} className="skc-card-slot" style={{ width: tileWidth }} {...cardMotion}>
                                                                <div className="skc-card">
                                                                    {stampedSuggestion === suggestion.productUuid && (
                                                                        <span className="skc-stamp" role="img" aria-label="Unlocks free delivery">
                                                                            <span>Free</span>
                                                                            <span>delivery</span>
                                                                        </span>
                                                                    )}
                                                                    <div className="skc-card-ph">
                                                                        {suggestion.image && (
                                                                            <img src={suggestion.image} srcSet={suggestion.srcSet} sizes={suggestion.srcSet ? THUMB_SIZES : undefined} alt="" loading="lazy" decoding="async" />
                                                                        )}
                                                                    </div>
                                                                    <h5>{suggestion.name}</h5>
                                                                    <span className="skc-card-price">
                                                                        {formatAmount(suggestion.amount)}
                                                                        {size && ` · ${size}`}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        className={`skc-plus${added ? " added" : ""}`}
                                                                        aria-label={`Add ${suggestion.name}`}
                                                                        onClick={() => confirmAdd(suggestion)}
                                                                    >
                                                                        <span className="l1"><BagIcon className="skc-plus-ic" />Add</span>
                                                                        <span className="l2" aria-hidden="true">✓ Added</span>
                                                                    </button>
                                                                </div>
                                                            </motion.li>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </motion.ul>
                                        </section>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </motion.div>

                {items.length > 0 && (
                    <motion.div variants={cartSectionVariants} className="skc-foot">
                        <div className="skc-sum">
                            <div>
                                <h3>Total</h3>
                                <small>
                                    {freeDeliveryLeft > 0
                                        ? <>Incl. {formatAmount(POLICY_FACTS.deliveryCharge)} delivery</>
                                        : <em>Free delivery</em>}
                                    {" · "}Cash on delivery
                                </small>
                            </div>
                            <span key={total} className={`skc-total${totalChanged ? " skc-tick" : ""}`}>{formatAmount(total)}</span>
                        </div>
                        <button type="button" onClick={openCheckout} className="skc-checkout">
                            Place order
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

export default function CartDrawer() {
    const { items, isOpen, setIsOpen, addToCart, dismissNotice, removeFromCart, updateQuantity, swapVariant, clearCart, itemCount } = useCart();
    const [orderOpen, setOrderOpen] = useState(false);
    const [checkoutBundle, setCheckoutBundle] = useState<OrderDialogBundle | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Use a matchMedia listener to detect mobile vs desktop to prevent the desktop Portal from rendering on mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const { data: catalogProducts } = useQuery({
        queryKey: ["merchant-suite-products-listing"],
        queryFn: fetchStorefrontProducts,
        ...STOREFRONT_CATALOG_QUERY_OPTIONS,
        enabled: isOpen,
    });
    const catalog = catalogProducts && catalogProducts.length ? catalogProducts : generatedStorefrontProducts;
    const catalogById = useMemo(() => new Map(catalog.map((product) => [String(product.id), product])), [catalog]);
    const suggestions = useMemo(() => buildSuggestions(catalog, items), [catalog, items]);
    // Photo URL -> its smaller sizes, for the bag's thumbnails.
    const thumbSrcSets = useMemo(() => {
        const index = new Map<string, string>();
        for (const product of catalog) {
            const { src, srcSet } = getProductImageSet(product);
            if (src && srcSet) index.set(src, srcSet);
        }
        return index;
    }, [catalog]);

    const cartOrder = useMemo<OrderDialogBundle | null>(() => {
        if (items.length === 0) {
            return null;
        }

        const subtotalAmount = items.reduce((total, item) => {
            const price = parseFloat(item.price.replace(/[^0-9]/g, ''));
            return total + ((Number.isNaN(price) ? 0 : price) * item.quantity);
        }, 0);

        return {
            title: "Cart Checkout",
            details: items.map((item) => `${item.quantity}x ${item.title}`).join(" + "),
            price: subtotalAmount,
            images: items.slice(0, 2).map((item) => ({
                src: item.image,
                alt: item.title
            })),
            analyticsItems: items.map((item) => item.analyticsItem
                ? { ...item.analyticsItem, quantity: item.quantity }
                : toGoogleAnalyticsItem({
                    id: item.productId,
                    name: item.title,
                    variant: item.size,
                    price: parseCurrencyAmount(item.price),
                    quantity: item.quantity,
                })),
            captureItems: items.map((item) => ({
                productName: item.title,
                variantName: item.size,
                quantity: item.quantity,
                unitPrice: parseCurrencyAmount(item.price),
            })),
            // Every cart item carries its canonical ids, so checkout always has
            // line items. Sending none makes the Suite reject the order.
            items: items.map((item) => ({ productId: item.productUuid, variantId: item.variantId, quantity: item.quantity })),
            lineItems: items.map((item) => ({
                // Cart titles end with " (size)"; the size shows as its own tag.
                name: item.title.replace(` (${item.size})`, ""),
                details: item.size,
                quantity: item.quantity,
                unitPrice: parseCurrencyAmount(item.price),
                image: item.image,
            })),
        };
    }, [items]);

    const openCheckout = () => {
        setCheckoutBundle(cartOrder);
        setIsOpen(false);
        setOrderOpen(true);
    };

    const updateOrderOpen = (nextOpen: boolean) => {
        setOrderOpen(nextOpen);
        if (!nextOpen) {
            setCheckoutBundle(null);
        }
    };

    const addSuggestion = (suggestion: Suggestion) => {
        const price = formatCardAmount(suggestion.amount);
        addToCart(
            {
                id: getProductNumericId(suggestion.product),
                title: `${suggestion.product.name} (${suggestion.variantLabel})`,
                price,
                image: suggestion.image,
                productUuid: suggestion.productUuid,
                variantId: suggestion.variantId,
                analyticsItem: toGoogleAnalyticsItem({
                    id: suggestion.product.id ?? suggestion.product.slug,
                    name: suggestion.product.name,
                    variant: suggestion.variantLabel,
                    price: suggestion.amount,
                    quantity: 1,
                }),
            },
            suggestion.variantLabel,
        );
        // The row appears in the open bag, so the "added" toast would only repeat it.
        dismissNotice();
    };

    const sizeOptionsFor = (item: CartItem) => getSizeOptions(catalogById.get(item.productUuid));
    const changeSize = (item: CartItem, option: SizeOption, quantity: number, keep = 0) => {
        const product = catalogById.get(item.productUuid);
        if (!product) return;
        swapVariant(item.id, toCartProduct(product, option), option.label, quantity, keep);
    };

    // Calculate subtotal
    const subtotal = items.reduce((total, item) => total + getItemAmount(item) * item.quantity, 0);

    // Same rule checkout applies: free over the threshold, or with a free-delivery product.
    const freeDeliveryThreshold = POLICY_FACTS.freeDeliveryThreshold;
    const freeByProduct = bundleHasFreeDeliveryProduct(cartOrder);
    const freeDeliveryLeft = freeByProduct ? 0 : Math.max(0, freeDeliveryThreshold - subtotal);
    const freeDeliveryProgress = freeByProduct ? 1 : Math.min(1, subtotal / freeDeliveryThreshold);
    const total = subtotal + (freeDeliveryLeft > 0 ? POLICY_FACTS.deliveryCharge : 0);

    // The cheapest add-on that alone covers what's left for free delivery wears the stamp.
    const stampedSuggestion = freeDeliveryLeft > 0
        ? suggestions.filter((suggestion) => suggestion.amount >= freeDeliveryLeft).sort((a, b) => a.amount - b.amount)[0]?.productUuid ?? null
        : null;
    // It also leads the rail — but the order is taken when the bag opens, so cards never reshuffle under a tap.
    const [railLead, setRailLead] = useState<string | null>(null);
    useEffect(() => {
        if (isOpen) setRailLead(stampedSuggestion);
    }, [isOpen]);
    const orderedSuggestions = railLead
        ? [...suggestions.filter((suggestion) => suggestion.productUuid === railLead), ...suggestions.filter((suggestion) => suggestion.productUuid !== railLead)]
        : suggestions;

    const innerProps: CartInnerContentProps = {
        items,
        isOpen,
        isMobile,
        setIsOpen,
        removeFromCart,
        updateQuantity,
        changeSize,
        sizeOptionsFor,
        itemCount,
        subtotal,
        total,
        freeDeliveryLeft,
        freeDeliveryProgress,
        suggestions: orderedSuggestions,
        stampedSuggestion,
        addSuggestion,
        openCheckout,
        thumbSrcSets,
    };

    return (
        <>
            {/* Vaul drawer: bottom sheet on phones, floating right panel on desktop — drag, tap outside or ✕ to close */}
            <Drawer.Root open={isOpen} onOpenChange={setIsOpen} direction={isMobile ? "bottom" : "right"}>
                <Drawer.Portal>
                    <Drawer.Overlay className="sk-sheet-overlay" />
                    <Drawer.Content
                        className={isMobile ? "sk-sheet sk-cart-sheet" : "sk-panel sk-panel-right"}
                        aria-describedby={undefined}
                    >
                        <Drawer.Title className="sr-only">Bag</Drawer.Title>
                        {isMobile && <div className="sk-sheet-grab" aria-hidden="true" />}
                        <div className="flex min-h-0 flex-1 flex-col">
                            <CartInnerContent {...innerProps} />
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <OrderDialog
                open={orderOpen}
                onOpenChange={updateOrderOpen}
                bundle={checkoutBundle}
                onSuccess={clearCart}
            />
        </>
    );
}
