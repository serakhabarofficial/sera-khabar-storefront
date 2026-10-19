import React, { createContext, useCallback, useContext, useState, useEffect, useRef } from 'react';
import { trackMerchantSuiteEvent } from "@/lib/merchant-suite";
import { trackGoogleEcommerceEvent, type GoogleAnalyticsItem } from "@/lib/google-analytics";
import { MAX_LINE_QUANTITY } from "@shared/order-limits";

export interface CartItem {
    id: string;
    productId: number;
    // Canonical Suite ids. Checkout posts these as the order's line items and
    // the Suite rejects an order without them, so they are required: an item
    // the cart cannot identify is an item the cart cannot sell.
    productUuid: string;
    variantId: string;
    title: string;
    price: string;
    image: string;
    size: string;
    quantity: number;
    analyticsItem?: GoogleAnalyticsItem;
}

export type AddToCartProduct = {
    id: number;
    title: string;
    price: string;
    image: string;
    productUuid: string;
    variantId: string;
    analyticsItem?: GoogleAnalyticsItem;
};

// The latest successful addition, shown as a floating confirmation. Only one
// notice exists at a time: a new add replaces it and restarts its lifecycle.
export type CartNotice = {
    key: number;
    itemId: string;
    title: string;
    size: string;
    image: string;
    quantityAdded: number;
};

// Carts saved before the ids were persisted deserialize without them. Such a
// row can never be checked out, so drop it on load instead of leaving a
// customer with a cart that fails every time they press Confirm Order.
function isOrderableCartItem(value: unknown): value is CartItem {
    if (!value || typeof value !== 'object') return false;
    const item = value as Partial<CartItem>;
    return typeof item.productUuid === 'string' && item.productUuid.length > 0
        && typeof item.variantId === 'string' && item.variantId.length > 0;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: AddToCartProduct, size: string, quantity?: number) => void;
    removeFromCart: (itemId: string) => void;
    updateQuantity: (itemId: string, quantity: number) => void;
    swapVariant: (itemId: string, product: AddToCartProduct, size: string, quantity: number, keep?: number) => void;
    clearCart: () => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    itemCount: number;
    notice: CartNotice | null;
    dismissNotice: () => void;
    // One-shot handoff: incremented when an auto-dismissed toast should pulse
    // the mobile dock cart, reset once the pulse animation has played.
    cartPulseKey: number;
    signalCartPulse: () => void;
    consumeCartPulse: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
// addToCart alone, with a stable identity: product cards and the product page only add,
// so they don't re-render on every cart change (which would delay the cart's own animations).
const AddToCartContext = createContext<CartContextType["addToCart"] | undefined>(undefined);

// Analytics runs after the next frame is painted, so it never delays the tap's feedback.
function afterNextPaint(run: () => void) {
    if (typeof requestAnimationFrame !== "function") return run();
    requestAnimationFrame(() => setTimeout(run, 0));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [notice, setNotice] = useState<CartNotice | null>(null);
    const [cartPulseKey, setCartPulseKey] = useState(0);
    const noticeSeq = useRef(0);

    // Load cart from localStorage on mount (migrates legacy stepprs-cart key)
    useEffect(() => {
        const savedCart = localStorage.getItem('serakhabar-cart') ?? localStorage.getItem('stepprs-cart');
        if (savedCart) {
            try {
                const parsed: unknown = JSON.parse(savedCart);
                setItems(Array.isArray(parsed) ? parsed.filter(isOrderableCartItem) : []);
            } catch (e) {
                console.error('Failed to parse cart from localStorage', e);
            }
        }
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('serakhabar-cart', JSON.stringify(items));
        localStorage.removeItem('stepprs-cart');
    }, [items]);

    const addToCart = useCallback((
        product: AddToCartProduct,
        size: string,
        quantity: number = 1
    ) => {
        const itemId = `${product.id}-${size}`;

        setItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === itemId);

            if (existingItem) {
                // Update quantity if item already exists
                return prevItems.map(item =>
                    item.id === itemId
                        ? { ...item, quantity: Math.min(MAX_LINE_QUANTITY, item.quantity + quantity) }
                        : item
                );
            } else {
                // Add new item
                return [
                    ...prevItems,
                    {
                        id: itemId,
                        productId: product.id,
                        productUuid: product.productUuid,
                        variantId: product.variantId,
                        title: product.title,
                        price: product.price,
                        image: product.image,
                        size,
                        quantity: Math.min(MAX_LINE_QUANTITY, quantity),
                        analyticsItem: product.analyticsItem
                    }
                ];
            }
        });

        // Show the floating confirmation instead of opening the drawer. The
        // shopper stays on the page; the drawer opens only on demand.
        noticeSeq.current += 1;
        setNotice({ key: noticeSeq.current, itemId, title: product.title, size, image: product.image, quantityAdded: quantity });
        afterNextPaint(() => {
            trackMerchantSuiteEvent("cart");

            const value = Number(String(product.price).replace(/[^0-9.]/g, "")) || 0;
            trackGoogleEcommerceEvent("add_to_cart", {
              pageType: "product",
              value,
              items: [
                product.analyticsItem
                  ? { ...product.analyticsItem, quantity }
                  : {
                      item_id: String(product.id),
                      item_name: product.title,
                      item_brand: "Sera Khabar",
                      item_category: "",
                      item_variant: size,
                      item_list_name: "",
                      item_list_id: "",
                      price: value,
                      discount: 0,
                      index: 0,
                      quantity,
                    },
              ],
            });
        });
    }, []);

    const removeFromCart = (itemId: string) => {
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(itemId);
            return;
        }

        setItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : item
            )
        );
    };

    // Changes a bag row to another size of the same product without moving it in the bag. `keep` units of the
    // old size stay on their own row just before it (switching an odd number of 500 g packs to 1 kg). If the
    // bag already holds the new size, that row takes the quantity instead. A swap is not an add, so it shows no
    // notice and sends no add_to_cart event.
    const swapVariant = (itemId: string, product: AddToCartProduct, size: string, quantity: number, keep = 0) => {
        const nextId = `${product.id}-${size}`;
        setItems(prevItems => {
            const index = prevItems.findIndex(item => item.id === itemId);
            if (index === -1) return prevItems;
            const old = prevItems[index];
            const rest = prevItems.filter((_, i) => i !== index);
            const kept = keep > 0 ? [{ ...old, quantity: keep }] : [];
            if (rest.some(item => item.id === nextId)) {
                const merged = rest.map(item =>
                    item.id === nextId ? { ...item, quantity: Math.min(MAX_LINE_QUANTITY, item.quantity + quantity) } : item
                );
                return [...merged.slice(0, index), ...kept, ...merged.slice(index)];
            }
            const swapped: CartItem = {
                id: nextId,
                productId: product.id,
                productUuid: product.productUuid,
                variantId: product.variantId,
                title: product.title,
                price: product.price,
                image: product.image,
                size,
                quantity: Math.min(MAX_LINE_QUANTITY, quantity),
                analyticsItem: product.analyticsItem,
            };
            return [...rest.slice(0, index), ...kept, swapped, ...rest.slice(index)];
        });
    };

    const clearCart = () => {
        setItems([]);
    };

    const dismissNotice = () => setNotice(null);
    const signalCartPulse = () => setCartPulseKey((key) => key + 1);
    const consumeCartPulse = () => setCartPulseKey(0);

    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                updateQuantity,
                swapVariant,
                clearCart,
                isOpen,
                setIsOpen,
                itemCount,
                notice,
                dismissNotice,
                cartPulseKey,
                signalCartPulse,
                consumeCartPulse
            }}
        >
            <AddToCartContext.Provider value={addToCart}>{children}</AddToCartContext.Provider>
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

export function useAddToCart() {
    const addToCart = useContext(AddToCartContext);
    if (addToCart === undefined) {
        throw new Error('useAddToCart must be used within a CartProvider');
    }
    return addToCart;
}
