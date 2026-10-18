import { useEffect, useRef, useState } from "react";
import { Check, Phone, X } from "lucide-react";
import { Drawer } from "vaul";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { OrderProtectionError } from "@/lib/order-protection-errors";
import { useCheckoutProtectionSignals } from "@/lib/order-protection";
import { OrderProtectionMessage } from "@/components/order-protection-message";
import { TurnstileChallenge } from "@/components/turnstile-challenge";
import { normalizeBdMobile } from "../../../shared/bd-phone";
import { OrderHoldConfirmation } from "@/components/order-hold-confirmation";
import { OrderConfirmed, warmOrderConfirmedArt, type ConfirmedOrder } from "@/components/order-confirmed";
import { readAbandonedCartCampaign, type AbandonedCartItem } from "@/lib/abandoned-cart-capture";
import { useAbandonedCartCapture } from "@/hooks/use-abandoned-cart-capture";
import { trackMerchantSuiteEvent } from "@/lib/merchant-suite";
import { bundleHasFreeDeliveryProduct, bundleHasLitchiFlowerHoney } from "@/lib/free-delivery";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent, type GoogleAnalyticsItem } from "@/lib/google-analytics";
import { observeCheckoutViewport, type CheckoutViewportStyle } from "@/lib/checkout-viewport";

const deliveryOptions = [
  { label: "Standard Delivery", bn: "সাধারণ ডেলিভারি", charge: 100 }
];

const freeDeliveryThreshold = 2600;

// Short restatement of the published policy pages (client/src/lib/site-pages.ts).
const checkoutPolicyPoints = [
  "পেমেন্ট শুধু ক্যাশ অন ডেলিভারি।",
  "ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৩ দিনে ডেলিভারি।",
  "পণ্যে সমস্যা হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে জানান।",
];


export type OrderDialogLineItem = {
  name: string;
  details: string;
  quantity: number;
  unitPrice: number;
  image: string;
};

export type OrderDialogBundle = {
  title: string;
  details: string;
  price: number;
  productId?: string;
  productSlug?: string;
  quantity?: number;
  unitPrice?: number;
  images: { src: string; alt: string }[];
  analyticsItems?: GoogleAnalyticsItem[];
  captureItems?: AbandonedCartItem[];
  items?: Array<{ productId: string; variantId: string; quantity: number }>;
  lineItems?: OrderDialogLineItem[];
};

function getBundleAnalyticsItems(bundle: OrderDialogBundle) {
  if (bundle.analyticsItems?.length) {
    return bundle.analyticsItems;
  }

  return [toGoogleAnalyticsItem({
    id: bundle.title,
    name: bundle.title,
    variant: bundle.details,
    price: bundle.unitPrice ?? bundle.price / (bundle.quantity ?? 1),
    quantity: bundle.quantity ?? 1,
  })];
}

export default function OrderDialog({
  open,
  onOpenChange,
  bundle: bundleProp,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: OrderDialogBundle | null;
  onSuccess?: () => void;
}) {
  // Callers clear the bundle as soon as checkout closes; keep showing the last one while the sheet slides away.
  const lastBundle = useRef(bundleProp);
  if (bundleProp) lastBundle.current = bundleProp;
  const bundle = bundleProp ?? lastBundle.current;
  const isMobile = useIsMobile();
  const [checkoutViewportStyle, setCheckoutViewportStyle] = useState<CheckoutViewportStyle>();
  const [openInstance, setOpenInstance] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(100);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  const [protectionDecision, setProtectionDecision] = useState<"review" | "block" | null>(null);
  const [protectionRetryable, setProtectionRetryable] = useState(true);
  const { formHandlers, trackPhoneCandidate, buildProtectionPayload,
    resetTurnstileSignal, resetTurnstile, setTurnstileToken } = useCheckoutProtectionSignals();
  const [paymentMethod, setPaymentMethod] = useState<"cash_on_delivery" | null>("cash_on_delivery");
  const previousOpen = useRef(open);
  const formRef = useRef<HTMLFormElement>(null);
  const capture = useAbandonedCartCapture("storefront");
  const bundleQuantity = bundle?.quantity ?? 1;
  const bundleUnitPrice = bundle?.unitPrice ?? ((bundle?.price ?? 0) / bundleQuantity);
  const hasFreeDeliveryProduct = bundleHasFreeDeliveryProduct(bundle);
  const isLitchiFlowerHoney = bundleHasLitchiFlowerHoney(bundle);
  const qualifiesForFreeDelivery = (bundle?.price ?? 0) >= freeDeliveryThreshold || hasFreeDeliveryProduct;
  const lineItems: OrderDialogLineItem[] = bundle?.lineItems?.length
    ? bundle.lineItems
    : bundle
      ? [{
        name: bundle.title,
        details: bundle.details,
        quantity: bundleQuantity,
        unitPrice: bundleUnitPrice,
        image: bundle.images[0]?.src ?? "",
      }]
      : [];
  const lineItemCount = lineItems.reduce((total, item) => total + item.quantity, 0);
  const whatsappOrderText = `Hello, I'd like to order: ${lineItems
    .map((item) => `${item.name}${item.details ? ` (${item.details})` : ""} x${item.quantity}`)
    .join(", ")}`;

  const getCaptureSnapshot = (form: HTMLFormElement | null = formRef.current) => {
    if (!bundle || deliveryCharge === null) return null;
    const formData = form ? new FormData(form) : null;
    return {
      customerName: String(formData?.get("name") || ""),
      phone: String(formData?.get("phone") || ""),
      address: String(formData?.get("address") || ""),
      items: bundle.captureItems?.length
        ? bundle.captureItems
        : [{
          productName: bundle.title,
          variantName: bundle.details,
          quantity: bundleQuantity,
          unitPrice: bundleUnitPrice,
        }],
      subtotal: bundle.price,
      deliveryRate: deliveryCharge,
      total: bundle.price + deliveryCharge,
      campaign: typeof window === "undefined" ? {} : readAbandonedCartCampaign(window.location.search),
    };
  };

  const updateCapture = (form?: HTMLFormElement | null) => {
    const snapshot = getCaptureSnapshot(form);
    return snapshot ? capture.capture(snapshot) : null;
  };

  const flushCapture = (form?: HTMLFormElement | null) => {
    const snapshot = getCaptureSnapshot(form);
    if (snapshot) void capture.flush(snapshot);
  };

  useEffect(() => {
    if (!open || !isMobile) return;
    return observeCheckoutViewport(window, setCheckoutViewportStyle);
  }, [open, isMobile]);

  useEffect(() => {
    if (!previousOpen.current && open) {
      setOpenInstance((current) => current + 1);
      warmOrderConfirmedArt();
      trackMerchantSuiteEvent("checkout");
      if (bundle) {
        trackGoogleEcommerceEvent("begin_checkout", {
          pageType: "checkout",
          value: bundle.price,
          items: getBundleAnalyticsItems(bundle),
        });
      }

    }
    previousOpen.current = open;
  }, [open, bundle, bundleQuantity, bundleUnitPrice]);

  useEffect(() => {
    if (open && qualifiesForFreeDelivery) {
      setDeliveryCharge(0);
    }
  }, [open, qualifiesForFreeDelivery]);

  useEffect(() => {
    if (open) updateCapture();
  }, [open, bundle, bundleQuantity, bundleUnitPrice, deliveryCharge]);

  const failField = (field: "name" | "phone" | "address", message: string) => {
    setOrderError(message);
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.focus({ preventScroll: true });
    }
  };

  useEffect(() => {
    if (orderSubmitted) {
      trackMerchantSuiteEvent("purchased");
    }
  }, [orderSubmitted]);

  const resetDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      void capture.finalize();
      onOpenChange(false);
      return;
    }

    onOpenChange(nextOpen);
    setDeliveryCharge(100);
    setOrderSubmitted(false);
    setOrderSubmitting(false);
    setOrderError("");
    setConfirmedOrder(null);
    setProtectionDecision(null);
    setPaymentMethod(null);
  };

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bundle) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const enteredPhone = String(formData.get("phone") || "").trim();
    const phone = normalizeBdMobile(enteredPhone);
    const address = String(formData.get("address") || "").trim();

    if (!name) {
      failField("name", "Please enter your full name.");
      return;
    }
    if (!enteredPhone) {
      failField("phone", "Please enter your phone number.");
      return;
    }
    if (!phone) {
      failField("phone", "ইংরেজি সংখ্যায় ১১ সংখ্যার মোবাইল নম্বর লিখুন, যেমন 01712345678।");
      return;
    }
    if (!address) {
      failField("address", "Please enter your delivery address.");
      return;
    }
    if (address.trim().length < 5) {
      failField("address", "সঠিক ডেলিভারি ঠিকানা লিখুন।");
      return;
    }

    if (deliveryCharge === null) {
      setOrderError("Please select a delivery charge before placing your order.");
      return;
    }
    if (paymentMethod === null) {
      setOrderError("Please select a payment method before placing your order.");
      return;
    }

    const selectedDeliveryCharge = deliveryCharge;
    const selectedPaymentMethod = paymentMethod;
    const draftKey = updateCapture(event.currentTarget);
    flushCapture(event.currentTarget);
    setOrderSubmitting(true);
    setOrderError("");
    setProtectionDecision(null);

    try {
      const response = await apiRequest("POST", "/api/orders", {
        bundleTitle: bundle.title,
        bundleDetails: bundle.details,
        bundlePrice: bundle.price,
        quantity: bundleQuantity,
        deliveryCharge: selectedDeliveryCharge,
        customerName: String(formData.get("name") || ""),
         phone,
         address,
        paymentMethod: selectedPaymentMethod,
        items: bundle.items,
        ...buildProtectionPayload(String(formData.get("hp_x7") || "")),
        ...(draftKey ? { draftKey } : {}),
      });
      const result = await response.json() as { orderRef?: unknown; decision?: unknown; reviewId?: unknown };
      if (response.status === 202 && result.decision === "review") {
        setProtectionDecision("review");
        setOrderError("");
        capture.clear();
        onSuccess?.();
        return;
      }
      if (typeof result.orderRef !== "string" || !result.orderRef.trim()) {
        throw new Error("Could not confirm order. Please try again.");
      }
      capture.clear();
      setConfirmedOrder({
        ref: result.orderRef,
        firstName: name.split(/\s+/)[0] ?? "",
        total: bundle.price + selectedDeliveryCharge,
      });
      setOrderSubmitted(true);
      onSuccess?.();
      trackGoogleEcommerceEvent("purchase", {
        pageType: "thank_you",
        value: bundle.price + selectedDeliveryCharge,
        items: getBundleAnalyticsItems(bundle),
        transactionId: result.orderRef,
        affiliation: "",
        tax: 0,
        shipping: selectedDeliveryCharge,
        coupon: "",
        customer: { name, phone, address },
      });

    } catch (error) {
      if (error instanceof OrderProtectionError) {
        setProtectionDecision("block");
        setProtectionRetryable(error.retryable);
        setOrderError("");
        return;
      }
      setOrderError(
        error instanceof Error
          ? error.message
          : "Could not place your order. Please try again.",
      );
    } finally {
      setOrderSubmitting(false);
      resetTurnstile();
    }
  };

  return (
    <Drawer.Root open={open} onOpenChange={resetDialog} direction={isMobile ? "bottom" : "right"} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="sk-sheet-overlay sko-overlay" />
        <Drawer.Content
          className={isMobile ? "sk-sheet sko-sheet" : "sk-panel sk-panel-right sko-panel"}
          style={isMobile ? checkoutViewportStyle : undefined}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {isMobile && <div className={orderSubmitted ? "sk-sheet-grab sko-grab-over" : "sk-sheet-grab"} aria-hidden="true" />}
          {bundle && (
            <div key={openInstance} className={orderSubmitted ? "sko sko-is-done" : "sko"}>
              <div className={orderSubmitted ? "sko-head sko-head-done" : "sko-head"}>
                <div>
                  <span className="sko-ask">ক্যাশ অন ডেলিভারি</span>
                  <Drawer.Title className="sko-title">অর্ডার করুন <small>Place Order</small></Drawer.Title>
                </div>
                <button type="button" onClick={() => resetDialog(false)} aria-label="Close" className="sko-close sko-press">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {orderSubmitted && confirmedOrder ? (
                <OrderConfirmed order={confirmedOrder} onClose={() => resetDialog(false)} />
              ) : protectionDecision === "review" ? (
                <div className="sko-done">
                  <OrderHoldConfirmation />
                  <button type="button" onClick={() => resetDialog(false)} className="sko-dark sko-press">
                    Close - বন্ধ
                  </button>
                </div>
              ) : (
                <form
                  id="order-dialog-form"
                  ref={formRef}
                  onSubmit={placeOrder}
                  onFocusCapture={formHandlers.onFocusCapture}
                  onPasteCapture={formHandlers.onPasteCapture}
                  onInput={(event) => {
                    if ((event.target as HTMLInputElement).name === "phone") trackPhoneCandidate((event.target as HTMLInputElement).value);
                    updateCapture();
                  }}
                  onBlurCapture={() => { flushCapture(); }}
                  className="sko-form"
                  data-vaul-no-drag
                  noValidate
                >
                  <input name="hp_x7" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" className="absolute -left-[9999px] h-px w-px opacity-0" />
                  <section aria-label="Your order - আপনার অর্ডার" className="sko-items">
                    <div className="sko-items-head">
                      <span>Your Order - আপনার অর্ডার</span>
                      <small>{lineItemCount} {lineItemCount === 1 ? "item" : "items"}</small>
                    </div>
                    <ul>
                      {lineItems.map((item, index) => (
                        <li key={`${item.name}-${item.details}-${index}`} className="sko-item">
                          <div className="sko-img">
                            {item.image ? <img src={item.image} alt={item.name} /> : null}
                          </div>
                          <div className="sko-item-info">
                            <h3>{item.name}</h3>
                            <div className="sko-chips">
                              {item.details ? <span>{item.details}</span> : null}
                              <span>Qty {item.quantity}</span>
                              {item.quantity > 1 ? (
                                <em>৳{item.unitPrice.toLocaleString()} each</em>
                              ) : null}
                            </div>
                          </div>
                          <span className="sko-item-price">
                            ৳{(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="sko-grid">
                    <label className="sko-field">
                      <span>Name - নাম</span>
                      <input required name="name" className="sko-input" placeholder="Your name" />
                    </label>
                    <label className="sko-field">
                      <span>Phone - ফোন</span>
                      <input
                        required
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={20}
                        className="sko-input"
                        placeholder="01XXXXXXXXX"
                      />
                    </label>
                  </div>

                  <label className="sko-field">
                    <span>Address - ঠিকানা</span>
                    <textarea
                      required
                      name="address"
                      rows={2}
                      className="sko-input sko-textarea"
                      placeholder="House, road, area, city - বাড়ি, রাস্তা, এলাকা, শহর"
                    />
                  </label>

                  <div className="sko-grid">
                    <div className="sko-field">
                      <span>Delivery Charge - ডেলিভারি চার্জ</span>
                      {qualifiesForFreeDelivery ? (
                        <div className="sko-option" data-selected>
                          <small>Free Delivery - ফ্রি ডেলিভারি</small>
                          <b>৳0</b>
                          <em>
                            {isLitchiFlowerHoney
                              ? "Free delivery on Litchi Flower Honey"
                              : hasFreeDeliveryProduct
                                ? "Free delivery on Black Seed Flower Honey"
                                : "Applied automatically for orders over ৳2600"}
                          </em>
                        </div>
                      ) : (
                        deliveryOptions.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setDeliveryCharge(option.charge)}
                            className="sko-option sko-press"
                            data-selected={deliveryCharge === option.charge || undefined}
                          >
                            <small>{option.label} - {option.bn}</small>
                            <b>৳{option.charge}</b>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="sko-field">
                      <span>Payment Method - পেমেন্ট পদ্ধতি</span>
                      {[
                        { value: "cash_on_delivery" as const, label: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentMethod(option.value)}
                          className="sko-option sko-option-pay sko-press"
                          data-selected={paymentMethod === option.value || undefined}
                        >
                          <small>{option.label}</small>
                          <b className="sko-pay-bn">{option.bn}</b>
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderError && <div className="sko-error">{orderError}</div>}

                  {protectionDecision === "block" ? <OrderProtectionMessage decision="block" retryable={protectionRetryable} /> : null}
                  <TurnstileChallenge onToken={setTurnstileToken} resetSignal={resetTurnstileSignal} />

                  <div className="sko-total">
                    <div className="sko-total-row">
                      <span>Items - আইটেম</span>
                      <b>৳{bundle.price.toLocaleString()}</b>
                    </div>
                    <div className="sko-total-row">
                      <span>Delivery - ডেলিভারি</span>
                      <b>{deliveryCharge === null ? "Select - সিলেক্ট" : deliveryCharge === 0 ? "Free - ফ্রি" : `৳${deliveryCharge}`}</b>
                    </div>
                    <div className="sko-total-sum">
                      <span>Total - মোট</span>
                      {deliveryCharge === null ? (
                        <em>Please select a delivery charge - ডেলিভারি চার্জ সিলেক্ট করুন</em>
                      ) : (
                        <b>৳{(bundle.price + deliveryCharge).toLocaleString()}</b>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className="sko-submit sko-press"
                  >
                    <span className="sko-submit-label">
                      {orderSubmitting ? "Placing Order... - অর্ডার হচ্ছে..." : "Place Order - অর্ডার করুন"}
                    </span>
                    <i aria-hidden="true" />
                  </button>

                  <div className="sko-help">
                    <p>
                      <b>অর্ডার করতে সমস্যা হচ্ছে?</b>
                      <span>আমরা সবসময় আপনাকে সাহায্য করতে প্রস্তুত</span>
                    </p>
                    <div className="sko-help-row">
                      <a href="tel:+8801310980289" className="sko-help-call sko-press">
                        <Phone className="h-4 w-4 stroke-[1.75px]" aria-hidden="true" />
                        ফোনে অর্ডার
                      </a>
                      <a
                        href={`https://wa.me/8801303103540?text=${encodeURIComponent(whatsappOrderText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sko-help-wa sko-press"
                      >
                        <img
                          src="https://cdn.reicon.dev/logos/whatsapp/original.svg"
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 brightness-0 invert"
                        />
                        হোয়াটসএপ-এ অর্ডার
                      </a>
                    </div>
                  </div>

                  <div className="sko-policy">
                    <p className="sko-policy-title">অর্ডার করার আগে জেনে নিন</p>
                    <ul>
                      {checkoutPolicyPoints.map((point) => (
                        <li key={point}>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="sko-policy-note">
                      অর্ডার করে আপনি আমাদের{" "}
                      <a href="/terms-and-conditions" target="_blank" rel="noopener">শর্তাবলি</a> ও{" "}
                      <a href="/refund-return-exchange" target="_blank" rel="noopener">রিটার্ন নীতিমালা</a>{" "}
                      মেনে নিচ্ছেন।
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
