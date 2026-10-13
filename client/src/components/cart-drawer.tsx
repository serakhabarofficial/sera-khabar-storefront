import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { Minus, Plus, X } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Drawer } from "vaul";
import { useMemo, useState, useEffect } from "react";
import OrderDialog, { type OrderDialogBundle } from "@/components/order-dialog";
import { parseCurrencyAmount, toGoogleAnalyticsItem } from "@/lib/google-analytics";

const cartEase = [0.23, 1, 0.32, 1] as const;

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

// Cart titles are "Bangla name | English Name (size)"; the card shows the Bangla name and the size as a chip.
function getCartItemName(item: { title: string; size: string }) {
    const name = item.title.replace(` (${item.size})`, "");
    return name.split("|")[0].trim() || name;
}

function CartInnerContent({ items, isOpen, setIsOpen, removeFromCart, updateQuantity, itemCount, subtotal, openCheckout }: any) {
    return (
        <div className="skc">
            <motion.div
                variants={cartPanelVariants}
                initial="closed"
                animate={isOpen ? "open" : "closed"}
                className="skc-inner"
            >
                {/* Header */}
                <motion.div variants={cartSectionVariants} className="skc-head">
                    <div>
                        <span className="skc-title">Your cart</span>
                        <span className="skc-count">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                    <button type="button" onClick={() => setIsOpen(false)} aria-label="Close cart" className="skc-close">
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>

                {/* Cart Items */}
                <motion.div variants={cartSectionVariants} className="skc-list">
                    <AnimatePresence mode="popLayout">
                        {items.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                                transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                className="skc-empty"
                            >
                                <h3>Your cart is empty</h3>
                                <p>Discover our curated collection</p>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsOpen(false)}
                                    className="h-auto whitespace-nowrap rounded-none border-0 border-b border-black bg-transparent px-0 py-1 text-[14px] font-bold text-[#5b2d17] shadow-none hover:bg-transparent"
                                >
                                    Continue Shopping
                                </Button>
                            </motion.div>
                        ) : (
                            items.map((item: any, index: number) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={isOpen ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.3, delay: index * 0.04, ease: [0.23, 1, 0.32, 1] }}
                                    className="skc-item"
                                >
                                    <div className="skc-img">
                                        <img src={item.image} alt={item.title} />
                                    </div>
                                    <div className="skc-info">
                                        <h3>{getCartItemName(item)}</h3>
                                        <span className="skc-size">{item.size}</span>
                                        <div className="skc-row">
                                            <span className="skc-price">{item.price}</span>
                                            <div className="skc-qty">
                                                <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                                                    <Minus className="w-3.5 h-3.5" />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => removeFromCart(item.id)} className="skc-remove">
                                            Remove
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Footer - Subtotal & Checkout */}
                {items.length > 0 && (
                    <motion.div variants={cartSectionVariants} className="skc-foot">
                        <div className="skc-subtotal">
                            <span>Subtotal</span>
                            {subtotal > 0 ? (
                                <b>৳{subtotal.toLocaleString("en-US")}</b>
                            ) : (
                                <span>Select Items</span>
                            )}
                        </div>
                        <p className="skc-note">Delivery charge is added at checkout</p>

                        {/* Checkout Button */}
                        <button type="button" onClick={openCheckout} className="skc-checkout">
                            Proceed to Checkout <i aria-hidden="true" />
                        </button>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="skc-continue whitespace-nowrap"
                        >
                            Continue Shopping
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

export default function CartDrawer() {
    const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, clearCart, itemCount } = useCart();
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

    // Calculate subtotal
    const subtotal = items.reduce((total, item) => {
        const price = parseFloat(item.price.replace(/[^0-9]/g, ''));
        return total + ((Number.isNaN(price) ? 0 : price) * item.quantity);
    }, 0);

    const innerProps = { items, isOpen, setIsOpen, removeFromCart, updateQuantity, clearCart, itemCount, openCheckout, subtotal };

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
                        <Drawer.Title className="sr-only">Your Cart</Drawer.Title>
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
