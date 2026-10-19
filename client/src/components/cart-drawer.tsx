import { useCart, type CartItem } from "@/contexts/cart-context";
import { Check, Minus, Plus, Trash2, X } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Drawer } from "vaul";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import OrderDialog, { type OrderDialogBundle } from "@/components/order-dialog";
import { formatCardAmount, getVariantLabel, selectDefaultVariant } from "@/components/home-product-card";
import { parseCurrencyAmount, toGoogleAnalyticsItem } from "@/lib/google-analytics";
import { bundleHasFreeDeliveryProduct } from "@/lib/free-delivery";
import { toBanglaDigits } from "@/lib/bangla-digits";
import { formatTaka } from "@/lib/product-sizes";
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

const cartEase = [0.23, 1, 0.32, 1] as const;
const MAX_SUGGESTIONS = 6;

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

// Cart titles are "Bangla name | English Name (size)"; the row shows the Bangla name and the size beside the price.
function getCartItemName(item: { title: string; size: string }) {
    const name = item.title.replace(` (${item.size})`, "");
    return name.split("|")[0].trim() || name;
}

function getItemAmount(item: CartItem) {
    const price = parseFloat(item.price.replace(/[^0-9]/g, ''));
    return Number.isNaN(price) ? 0 : price;
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
// known) and not already in the bag. Ones added from this rail stay, ticked.
function buildSuggestions(catalog: StorefrontProduct[], items: CartItem[], addedHere: string[]) {
    const inCart = new Set(items.map((item) => item.productUuid));
    const suggestions: Suggestion[] = [];
    for (const product of catalog) {
        if (suggestions.length >= MAX_SUGGESTIONS) break;
        const variant = selectDefaultVariant(product);
        const productUuid = product.id != null ? String(product.id) : "";
        const variantId = variant?.id != null ? String(variant.id) : "";
        if (product.available === false || !productUuid || !variantId) continue;
        if (inCart.has(productUuid) && !addedHere.includes(productUuid)) continue;
        const { src, srcSet } = getProductImageSet(product);
        suggestions.push({
            product,
            productUuid,
            variantId,
            variantLabel: getVariantLabel(variant),
            name: product.name.split("|")[0].trim() || product.name,
            amount: Number(variant?.price ?? product.price) || 0,
            image: src,
            srcSet,
        });
    }
    return suggestions;
}

type CartInnerContentProps = {
    items: CartItem[];
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    removeFromCart: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    itemCount: number;
    subtotal: number;
    freeDeliveryLeft: number;
    freeDeliveryProgress: number;
    suggestions: Suggestion[];
    isInCart: (productUuid: string) => boolean;
    addSuggestion: (suggestion: Suggestion) => void;
    openCheckout: () => void;
};

function CartInnerContent({
    items,
    isOpen,
    setIsOpen,
    removeFromCart,
    updateQuantity,
    itemCount,
    subtotal,
    freeDeliveryLeft,
    freeDeliveryProgress,
    suggestions,
    isInCart,
    addSuggestion,
    openCheckout,
}: CartInnerContentProps) {
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
                        ব্যাগ
                        {itemCount > 0 && <span className="skc-count"><span className="num">{toBanglaDigits(itemCount)}</span>টি পণ্য</span>}
                    </h2>
                    <button type="button" onClick={() => setIsOpen(false)} aria-label="বন্ধ করুন" className="skc-close">
                        <X className="w-[18px] h-[18px]" />
                    </button>
                </motion.div>

                <motion.div variants={cartSectionVariants} className="skc-body">
                    {items.length === 0 ? (
                        <div className="skc-empty">
                            <svg viewBox="0 0 24 24" width="54" height="54" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M5 8h14l-1 12H6z" />
                                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
                            </svg>
                            <h3>ব্যাগ এখনও খালি</h3>
                            <p>খেজুরের গুড়, আচার, মধু — পছন্দেরটা বেছে নিন</p>
                            <button type="button" onClick={() => setIsOpen(false)} className="skc-browse">
                                কেনাকাটা চালিয়ে যান <i aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <ul className="skc-list">
                                <AnimatePresence initial={false}>
                                    {items.map((item) => {
                                        const name = getCartItemName(item);
                                        return (
                                            <motion.li
                                                key={item.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.24, ease: cartEase }}
                                                className="skc-item"
                                            >
                                                <div className="skc-row">
                                                    <div className="skc-img">
                                                        <img src={item.image} alt="" />
                                                    </div>
                                                    <div className="skc-info">
                                                        <h3>{name}</h3>
                                                        <div className="skc-meta">
                                                            {item.size !== "Default" && <>{item.size} · </>}
                                                            <span className="skc-price">{formatTaka(getItemAmount(item) * item.quantity)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="skc-qty">
                                                        <button type="button" aria-label={`${name} একটি কমান`} onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span>{toBanglaDigits(item.quantity)}</span>
                                                        <button type="button" aria-label={`${name} একটি বাড়ান`} disabled={item.quantity >= MAX_LINE_QUANTITY} onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <button type="button" onClick={() => removeFromCart(item.id)} aria-label={`${name} বাদ দিন`} title="বাদ দিন" className="skc-remove">
                                                        <Trash2 />
                                                    </button>
                                                </div>
                                            </motion.li>
                                        );
                                    })}
                                </AnimatePresence>
                            </ul>

                            {suggestions.length > 0 && (
                                <section className="skc-add" aria-labelledby="skc-add-title">
                                    <h4 id="skc-add-title">এর সাথে যোগ করুন</h4>
                                    {/* data-vaul-no-drag: sideways scrolling must not drag the drawer shut */}
                                    <ul className="skc-rail" data-vaul-no-drag>
                                        {suggestions.map((suggestion) => {
                                            const added = isInCart(suggestion.productUuid);
                                            return (
                                                <li key={suggestion.productUuid} className="skc-card">
                                                    <div className="skc-card-ph">
                                                        {suggestion.image && (
                                                            <img src={suggestion.image} srcSet={suggestion.srcSet} sizes={suggestion.srcSet ? "120px" : undefined} alt="" loading="lazy" decoding="async" />
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="skc-plus"
                                                            data-added={added ? "" : undefined}
                                                            disabled={added}
                                                            aria-label={added ? `${suggestion.name} ব্যাগে আছে` : `${suggestion.name} যোগ করুন`}
                                                            onClick={() => addSuggestion(suggestion)}
                                                        >
                                                            {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                    <h5>{suggestion.name}</h5>
                                                    <span className="skc-card-price">{formatTaka(suggestion.amount)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            )}
                        </>
                    )}
                </motion.div>

                {items.length > 0 && (
                    <motion.div variants={cartSectionVariants} className="skc-foot">
                        <div className="skc-bar">
                            <span className="skc-bar-line" aria-hidden="true">
                                <motion.i
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: freeDeliveryProgress }}
                                    transition={{ duration: 0.52, ease: cartEase }}
                                    style={{ originX: 0 }}
                                />
                            </span>
                            <div className="min-w-0">
                                <small>
                                    {freeDeliveryLeft > 0
                                        ? <>আর <b>{formatTaka(freeDeliveryLeft)}</b> হলে ডেলিভারি ফ্রি</>
                                        : <>ডেলিভারি <b>ফ্রি</b> · ক্যাশ অন ডেলিভারি</>}
                                </small>
                                <span className="skc-total">{formatTaka(subtotal)}</span>
                            </div>
                            <button type="button" onClick={openCheckout} className="skc-checkout">
                                অর্ডার <i aria-hidden="true" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

export default function CartDrawer() {
    const { items, isOpen, setIsOpen, addToCart, dismissNotice, removeFromCart, updateQuantity, clearCart, itemCount } = useCart();
    const [orderOpen, setOrderOpen] = useState(false);
    const [checkoutBundle, setCheckoutBundle] = useState<OrderDialogBundle | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [addedHere, setAddedHere] = useState<string[]>([]);

    // Use a matchMedia listener to detect mobile vs desktop to prevent the desktop Portal from rendering on mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (!isOpen) setAddedHere([]);
    }, [isOpen]);

    const { data: catalogProducts } = useQuery({
        queryKey: ["merchant-suite-products-listing"],
        queryFn: fetchStorefrontProducts,
        ...STOREFRONT_CATALOG_QUERY_OPTIONS,
        enabled: isOpen,
    });
    const catalog = catalogProducts && catalogProducts.length ? catalogProducts : generatedStorefrontProducts;
    const suggestions = useMemo(() => buildSuggestions(catalog, items, addedHere), [catalog, items, addedHere]);

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
        setAddedHere((ids) => [...ids, suggestion.productUuid]);
    };

    // Calculate subtotal
    const subtotal = items.reduce((total, item) => total + getItemAmount(item) * item.quantity, 0);

    // Same rule checkout applies: free over the threshold, or with a free-delivery product.
    const freeDeliveryThreshold = POLICY_FACTS.freeDeliveryThreshold;
    const freeByProduct = bundleHasFreeDeliveryProduct(cartOrder);
    const freeDeliveryLeft = freeByProduct ? 0 : Math.max(0, freeDeliveryThreshold - subtotal);
    const freeDeliveryProgress = freeByProduct ? 1 : Math.min(1, subtotal / freeDeliveryThreshold);

    const inCartIds = new Set(items.map((item) => item.productUuid));

    const innerProps: CartInnerContentProps = {
        items,
        isOpen,
        setIsOpen,
        removeFromCart,
        updateQuantity,
        itemCount,
        subtotal,
        freeDeliveryLeft,
        freeDeliveryProgress,
        suggestions,
        isInCart: (productUuid) => inCartIds.has(productUuid),
        addSuggestion,
        openCheckout,
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
                        <Drawer.Title className="sr-only">ব্যাগ</Drawer.Title>
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
