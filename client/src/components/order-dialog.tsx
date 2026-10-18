import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createPortal, flushSync } from "react-dom";
import { ArrowLeft, ArrowUpRight, Banknote, Check, ChevronDown, Phone, Truck } from "lucide-react";
import headerLogo from "@assets/sera-khabar-leaf-logo.webp";
import { apiRequest } from "@/lib/queryClient";
import { OrderProtectionError } from "@/lib/order-protection-errors";
import { useCheckoutProtectionSignals } from "@/lib/order-protection";
import { OrderProtectionMessage } from "@/components/order-protection-message";
import { TurnstileChallenge } from "@/components/turnstile-challenge";
import { PlaceCombobox } from "@/components/place-combobox";
import { PaperClip } from "@/components/paper-clip";
import { normalizeBdMobile } from "../../../shared/bd-phone";
import { MAX_LINE_QUANTITY } from "../../../shared/order-limits";
import { OrderHoldConfirmation } from "@/components/order-hold-confirmation";
import { OrderConfirmed, warmOrderConfirmedArt, type ConfirmedOrder } from "@/components/order-confirmed";
import { readAbandonedCartCampaign, type AbandonedCartItem } from "@/lib/abandoned-cart-capture";
import { useAbandonedCartCapture } from "@/hooks/use-abandoned-cart-capture";
import { trackMerchantSuiteEvent } from "@/lib/merchant-suite";
import { bundleHasFreeDeliveryProduct, bundleHasLitchiFlowerHoney } from "@/lib/free-delivery";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent, type GoogleAnalyticsItem } from "@/lib/google-analytics";
import { composeDeliveryAddress, deliveryWindow, findDistrict, findThana } from "@/lib/bd-locations";
import "../checkout-page.css";

const DELIVERY_CHARGE = 100;
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

type CheckoutField = "name" | "phone" | "district" | "thana" | "address";
type CheckoutValues = { name: string; phone: string; district: string | null; thana: string | null; address: string };
const emptyValues: CheckoutValues = { name: "", phone: "", district: null, thana: null, address: "" };

const toBanglaDigits = (value: string | number) => String(value).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
const toLatinDigits = (value: string) => value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
const money = (amount: number) => `৳${toBanglaDigits(amount.toLocaleString("en-IN"))}`;

/** Every message names the fix; the first field that needs one gets focus. */
export function validateCheckout(values: CheckoutValues) {
  const errors: Partial<Record<CheckoutField, string>> = {};
  if (values.name.trim().length < 2) errors.name = "আপনার পুরো নাম লিখুন।";
  if (!values.phone.trim()) errors.phone = "মোবাইল নম্বর লিখুন।";
  else if (!normalizeBdMobile(toLatinDigits(values.phone))) errors.phone = "সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখুন, যেমন 01712345678।";
  if (!values.district) errors.district = "জেলা বেছে নিন।";
  if (!values.thana) errors.thana = values.district ? "থানা বেছে নিন।" : "আগে জেলা বেছে নিন।";
  if (values.address.trim().length < 4) errors.address = "বাড়ি, রাস্তা বা এলাকার নাম লিখুন।";
  return errors;
}

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

const HISTORY_KEY = "skCheckout";

/**
 * Checkout is its own page (approved 2026-10-18, "Memo" + "Lift"): অর্ডার করুন swaps it in at once and the
 * browser animates the swap with a View Transition. A history entry lets the phone's back button return
 * to the product, at the same scroll position. Nothing is awaited before the page appears.
 */
export default function OrderDialog({
  open,
  onOpenChange,
  bundle: bundleProp,
  onSuccess,
  onQuantityChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: OrderDialogBundle | null;
  onSuccess?: () => void;
  /** Single-product checkout: lets the customer change the quantity on the order page. */
  onQuantityChange?: (quantity: number) => void;
}) {
  // Callers clear the bundle as soon as checkout closes; keep showing the last one while the page animates away.
  const lastBundle = useRef(bundleProp);
  if (bundleProp) lastBundle.current = bundleProp;
  const bundle = bundleProp ?? lastBundle.current;
  const [shown, setShown] = useState(false);
  const [values, setValues] = useState<CheckoutValues>(emptyValues);
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmedOrder | null>(null);
  const [protectionDecision, setProtectionDecision] = useState<"review" | "block" | null>(null);
  const [protectionRetryable, setProtectionRetryable] = useState(true);
  const { formHandlers, trackPhoneCandidate, buildProtectionPayload,
    resetTurnstileSignal, resetTurnstile, setTurnstileToken } = useCheckoutProtectionSignals();
  const previousOpen = useRef(open);
  const formRef = useRef<HTMLFormElement>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    district: useRef<HTMLInputElement>(null),
    thana: useRef<HTMLInputElement>(null),
    address: useRef<HTMLTextAreaElement>(null),
  };
  const capture = useAbandonedCartCapture("storefront");
  const bundleQuantity = bundle?.quantity ?? 1;
  const bundleUnitPrice = bundle?.unitPrice ?? ((bundle?.price ?? 0) / bundleQuantity);
  const hasFreeDeliveryProduct = bundleHasFreeDeliveryProduct(bundle);
  const isLitchiFlowerHoney = bundleHasLitchiFlowerHoney(bundle);
  const qualifiesForFreeDelivery = (bundle?.price ?? 0) >= freeDeliveryThreshold || hasFreeDeliveryProduct;
  const deliveryCharge = qualifiesForFreeDelivery ? 0 : DELIVERY_CHARGE;
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
  const canEditQuantity = Boolean(onQuantityChange) && lineItems.length === 1;
  const whatsappOrderText = `Hello, I'd like to order: ${lineItems
    .map((item) => `${item.name}${item.details ? ` (${item.details})` : ""} x${item.quantity}`)
    .join(", ")}`;
  const eta = deliveryWindow(values.district);
  const freeDeliveryReason = isLitchiFlowerHoney
    ? "লিচু ফুলের মধুতে ডেলিভারি ফ্রি"
    : hasFreeDeliveryProduct
      ? "এই মধুতে ডেলিভারি ফ্রি"
      : `${money(freeDeliveryThreshold)}+ অর্ডারে ডেলিভারি ফ্রি`;

  const getCaptureSnapshot = (current: CheckoutValues = valuesRef.current) => {
    if (!bundle) return null;
    return {
      customerName: current.name,
      phone: current.phone,
      address: composeDeliveryAddress(current.address, current.thana, current.district),
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

  const updateCapture = (current?: CheckoutValues) => {
    const snapshot = getCaptureSnapshot(current);
    return snapshot ? capture.capture(snapshot) : null;
  };

  const flushCapture = (current?: CheckoutValues) => {
    const snapshot = getCaptureSnapshot(current);
    if (snapshot) void capture.flush(snapshot);
  };

  const setField = (field: CheckoutField, value: string | null, extra: Partial<CheckoutValues> = {}) => {
    const next = { ...valuesRef.current, [field]: value, ...extra };
    valuesRef.current = next;
    setValues(next);
    setErrors((current) => {
      if (!current[field] && !(field === "district" && current.thana)) return current;
      const rest = { ...current };
      delete rest[field];
      if (field === "district") delete rest.thana;
      return rest;
    });
    updateCapture(next);
  };

  const resetDialog = (nextOpen: boolean) => {
    if (!nextOpen) {
      void capture.finalize();
      onOpenChange(false);
      return;
    }
    onOpenChange(true);
  };
  const closeRef = useRef(() => resetDialog(false));
  closeRef.current = () => resetDialog(false);

  // ---------- Showing the page: swap instantly, let the browser animate the swap ----------
  const wasOpen = useRef(false);
  const running = useRef<ViewTransition | null>(null);
  const skipAnimation = useRef(false);
  const targetShown = useRef(false);
  const settled = useRef(orderSubmitted || protectionDecision === "review");
  settled.current = orderSubmitted || protectionDecision === "review";

  useLayoutEffect(() => {
    if (open === wasOpen.current) return;
    wasOpen.current = open;
    targetShown.current = open;
    // A finished order starts the next one from a clean memo; an abandoned one keeps what was typed.
    if (open && settled.current) {
      setValues(emptyValues);
      setErrors({});
      setOrderSubmitted(false);
      setConfirmedOrder(null);
      setProtectionDecision(null);
      setOrderError("");
    }
    const root = document.documentElement;
    const animate = !skipAnimation.current && typeof document.startViewTransition === "function";
    skipAnimation.current = false;
    if (!animate) {
      setShown(open);
      return;
    }
    running.current?.skipTransition();
    root.dataset.skNav = open ? "forward" : "back";
    const transition = document.startViewTransition(() => {
      flushSync(() => setShown(targetShown.current));
    });
    running.current = transition;
    transition.finished.finally(() => {
      if (running.current !== transition) return;
      running.current = null;
      delete root.dataset.skNav;
    });
  }, [open]);

  // While the page is shown, the rest of the app is hidden so the document itself scrolls (no nested
  // scroll container to fight the phone keyboard). Leaving restores the product page where it was.
  useLayoutEffect(() => {
    if (!shown) return;
    const root = document.documentElement;
    const productScroll = window.scrollY;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    root.setAttribute("data-sk-checkout", "");
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("skx-title")?.focus({ preventScroll: true });
    return () => {
      root.removeAttribute("data-sk-checkout");
      window.scrollTo({ top: productScroll, behavior: "instant" });
      trigger?.focus({ preventScroll: true });
    };
  }, [shown]);

  // The back button closes checkout instead of leaving the site.
  const historyToken = useRef(`${Date.now()}-${Math.random()}`);
  const ownsHistoryEntry = () => window.history.state?.[HISTORY_KEY] === historyToken.current;
  const openRef = useRef(open);
  openRef.current = open;
  const historyOpen = useRef(false);
  useEffect(() => {
    if (open && !historyOpen.current && !ownsHistoryEntry()) {
      window.history.pushState({ ...window.history.state, [HISTORY_KEY]: historyToken.current }, "");
    } else if (!open && historyOpen.current && ownsHistoryEntry()) {
      window.history.back();
    }
    historyOpen.current = open;
  }, [open]);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      if (!openRef.current || ownsHistoryEntry()) return;
      // iOS Safari's edge swipe already animated the page; don't play a second animation on top.
      skipAnimation.current = "hasUAVisualTransition" in event && Boolean(event.hasUAVisualTransition);
      closeRef.current();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!previousOpen.current && open) {
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
    if (open) updateCapture();
  }, [open, bundle, bundleQuantity, bundleUnitPrice, deliveryCharge]);

  useEffect(() => {
    if (orderSubmitted) {
      trackMerchantSuiteEvent("purchased");
    }
  }, [orderSubmitted]);

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bundle) {
      return;
    }

    const current = valuesRef.current;
    const fieldErrors = validateCheckout(current);
    const firstInvalid = (Object.keys(fieldRefs) as CheckoutField[]).find((field) => fieldErrors[field]);
    setErrors(fieldErrors);
    if (firstInvalid) {
      setOrderError("");
      const element = fieldRefs[firstInvalid].current;
      if (element && !element.disabled) {
        element.focus({ preventScroll: true });
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        fieldRefs.district.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }

    const name = current.name.trim();
    const phone = normalizeBdMobile(toLatinDigits(current.phone))!;
    const address = composeDeliveryAddress(current.address, current.thana, current.district);
    const honeypot = String(new FormData(event.currentTarget).get("hp_x7") || "");
    const draftKey = updateCapture(current);
    flushCapture(current);
    setOrderSubmitting(true);
    setOrderError("");
    setProtectionDecision(null);

    try {
      const response = await apiRequest("POST", "/api/orders", {
        bundleTitle: bundle.title,
        bundleDetails: bundle.details,
        bundlePrice: bundle.price,
        quantity: bundleQuantity,
        deliveryCharge,
        customerName: name,
        phone,
        address,
        paymentMethod: "cash_on_delivery",
        items: bundle.items,
        ...buildProtectionPayload(honeypot),
        ...(draftKey ? { draftKey } : {}),
      });
      const result = await response.json() as { orderRef?: unknown; decision?: unknown; reviewId?: unknown };
      if (response.status === 202 && result.decision === "review") {
        setProtectionDecision("review");
        setOrderError("");
        capture.clear();
        onSuccess?.();
        window.scrollTo({ top: 0, behavior: "instant" });
        return;
      }
      if (typeof result.orderRef !== "string" || !result.orderRef.trim()) {
        throw new Error("অর্ডারটি নিশ্চিত করা যায়নি। আবার চেষ্টা করুন।");
      }
      capture.clear();
      setConfirmedOrder({
        ref: result.orderRef,
        firstName: name.split(/\s+/)[0] ?? "",
        total: bundle.price + deliveryCharge,
      });
      setOrderSubmitted(true);
      onSuccess?.();
      window.scrollTo({ top: 0, behavior: "instant" });
      trackGoogleEcommerceEvent("purchase", {
        pageType: "thank_you",
        value: bundle.price + deliveryCharge,
        items: getBundleAnalyticsItems(bundle),
        transactionId: result.orderRef,
        affiliation: "",
        tax: 0,
        shipping: deliveryCharge,
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
          : "অর্ডার পাঠানো যায়নি। আবার চেষ্টা করুন।",
      );
    } finally {
      setOrderSubmitting(false);
      resetTurnstile();
    }
  };

  if (!shown || !bundle || typeof document === "undefined") return null;

  const close = () => closeRef.current();
  const total = bundle.price + deliveryCharge;
  const districtName = findDistrict(values.district)?.[1] ?? "";
  const thanaName = findThana(values.thana)?.[2] ?? "";
  const textField = (field: "name" | "phone", label: string, english: string, placeholder: string, hint?: string) => (
    <div className="skx-field">
      <label htmlFor={`skx-${field}`}>{label}<small>{english}</small></label>
      <input
        ref={fieldRefs[field]}
        id={`skx-${field}`}
        name={field}
        type={field === "phone" ? "tel" : "text"}
        inputMode={field === "phone" ? "tel" : undefined}
        maxLength={field === "phone" ? 20 : 120}
        autoComplete={field === "phone" ? "tel" : "name"}
        placeholder={placeholder}
        value={values[field]}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={errors[field] ? `skx-${field}-error` : hint ? `skx-${field}-hint` : undefined}
        onChange={(event) => {
          if (field === "phone") trackPhoneCandidate(event.target.value);
          setField(field, event.target.value);
        }}
      />
      {errors[field] ? (
        <span className="skx-field-error" id={`skx-${field}-error`} role="alert">{errors[field]}</span>
      ) : hint ? (
        <span className="skx-field-hint" id={`skx-${field}-hint`}>{hint}</span>
      ) : null}
    </div>
  );

  return createPortal(
    <div className="skx">
      <header className="skx-header">
        <div className="skx-header-in">
          <button type="button" className="skx-back" onClick={close} aria-label="পণ্যে ফিরে যান">
            <ArrowLeft aria-hidden="true" />
            <span>ফিরে যান</span>
          </button>
          <button type="button" className="skx-brand" onClick={close} aria-label="সেরা খাবার — পণ্যে ফিরে যান">
            <img src={headerLogo} alt="" width={86} height={58} />
          </button>
          <span className="skx-assure">
            <Banknote aria-hidden="true" />
            <span>পণ্য হাতে পেয়ে পেমেন্ট</span>
          </span>
        </div>
      </header>

      <main className="skx-main">
        {orderSubmitted && confirmedOrder ? (
          <div className="skx-done">
            <h1 id="skx-title" tabIndex={-1} className="sr-only">অর্ডার কনফার্ম</h1>
            <OrderConfirmed order={confirmedOrder} onClose={close} />
          </div>
        ) : protectionDecision === "review" ? (
          <div className="skx-done skx-hold">
            <h1 id="skx-title" tabIndex={-1} className="sr-only">অর্ডারটি পেয়েছি</h1>
            <OrderHoldConfirmation />
            <button type="button" onClick={close} className="skx-secondary">পণ্যে ফিরে যান</button>
          </div>
        ) : (
          <>
            <div className="skx-intro">
              <span className="skx-script">ঘরের স্বাদ, ঘরে পৌঁছে দিই</span>
              <p>আপনার পছন্দের খাবার এবার আপনার ঠিকানায়।</p>
            </div>
            <div className="skx-paper-wrap">
              <PaperClip layer="back" />
              <article className="skx-paper">
                <div className="skx-paper-head">
                  <img src="/home/leaf-mark.webp" alt="" width={48} height={48} />
                  <div>
                    <h1 id="skx-title" tabIndex={-1}>অর্ডার মেমো</h1>
                    <p>সেরা খাবার · রাজশাহী</p>
                  </div>
                  <span className="skx-serial" aria-hidden="true">খাতা নং<br /><b>০১</b></span>
                </div>

                <div className="skx-order">
                  <div className="skx-label-row">
                    <span>আপনার পছন্দের খাবার</span>
                    <span>{toBanglaDigits(lineItemCount)} প্যাক</span>
                  </div>
                  <ul className="skx-items" aria-label="আপনার অর্ডার">
                    {lineItems.map((item, index) => (
                      <li key={`${item.name}-${item.details}-${index}`} className={canEditQuantity ? "skx-item skx-item-editable" : "skx-item"}>
                        {item.image ? <img src={item.image} alt="" width={80} height={80} /> : <span />}
                        <div className="skx-item-copy">
                          <h3>{item.name}</h3>
                          <p>{item.details}{canEditQuantity ? "" : `${item.details ? " · " : ""}${toBanglaDigits(item.quantity)} প্যাক`}</p>
                        </div>
                        {canEditQuantity ? (
                          <div className="skx-qty" role="group" aria-label={`${item.name} পরিমাণ`}>
                            <button type="button" aria-label="কমান" disabled={item.quantity <= 1} onClick={() => onQuantityChange?.(item.quantity - 1)}>−</button>
                            <output aria-live="polite">{toBanglaDigits(item.quantity)}</output>
                            <button type="button" aria-label="বাড়ান" disabled={item.quantity >= MAX_LINE_QUANTITY} onClick={() => onQuantityChange?.(item.quantity + 1)}>+</button>
                          </div>
                        ) : null}
                        <strong className="skx-item-price">{money(item.unitPrice * item.quantity)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <form
                  id="order-dialog-form"
                  ref={formRef}
                  onSubmit={placeOrder}
                  onFocusCapture={formHandlers.onFocusCapture}
                  onPasteCapture={formHandlers.onPasteCapture}
                  onBlurCapture={() => { flushCapture(); }}
                  className="skx-form"
                  noValidate
                >
                  <input name="hp_x7" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" className="absolute -left-[9999px] h-px w-px opacity-0" />
                  <section className="skx-section" aria-label="আপনার নাম, নম্বর ও ঠিকানা">
                    <div className="skx-row">
                      {textField("name", "আপনার নাম", "Full name", "যেমন: সিহাব আহমেদ")}
                      {textField("phone", "মোবাইল নম্বর", "Phone number", "01XXXXXXXXX", "এই নম্বরেই অর্ডার কনফার্ম করব।")}
                    </div>
                    <div className="skx-row skx-place-row">
                      <PlaceCombobox
                        ref={fieldRefs.district}
                        kind="district"
                        districtId={values.district}
                        value={values.district}
                        selectedLabel={districtName}
                        error={errors.district}
                        onPick={(id) => {
                          const changed = id !== valuesRef.current.district;
                          flushSync(() => setField("district", id, changed ? { thana: null } : {}));
                          fieldRefs.thana.current?.focus();
                        }}
                      />
                      <PlaceCombobox
                        ref={fieldRefs.thana}
                        kind="thana"
                        districtId={values.district}
                        value={values.thana}
                        selectedLabel={thanaName}
                        error={errors.thana}
                        onPick={(id) => {
                          setField("thana", id);
                          fieldRefs.address.current?.focus();
                        }}
                      />
                    </div>
                    <div className="skx-field">
                      <label htmlFor="skx-address">সম্পূর্ণ ঠিকানা<small>Delivery address</small></label>
                      <textarea
                        ref={fieldRefs.address}
                        id="skx-address"
                        name="address"
                        rows={3}
                        maxLength={300}
                        autoComplete="street-address"
                        placeholder="বাড়ি / হোল্ডিং, রাস্তা, এলাকা"
                        value={values.address}
                        aria-invalid={Boolean(errors.address)}
                        aria-describedby={errors.address ? "skx-address-error" : undefined}
                        onChange={(event) => setField("address", event.target.value)}
                      />
                      {errors.address ? <span className="skx-field-error" id="skx-address-error" role="alert">{errors.address}</span> : null}
                    </div>
                  </section>

                  <section className="skx-payment" aria-label="পেমেন্ট ও ডেলিভারি">
                    <div className="skx-stamp" aria-hidden="true">আগে অর্ডার<br /><b>পরে পেমেন্ট</b><small>ক্যাশ অন ডেলিভারি</small></div>
                    <div className="skx-pay-note">
                      <span className="skx-pay-icon"><Banknote aria-hidden="true" /></span>
                      <div>
                        <strong>ক্যাশ অন ডেলিভারি</strong>
                        <p>পণ্য হাতে পেয়ে টাকা দেবেন। এখন কোনো পেমেন্ট নয়।</p>
                      </div>
                      <span className="skx-pay-check"><Check aria-hidden="true" /></span>
                    </div>
                    <div className="skx-delivery-note">
                      <Truck aria-hidden="true" />
                      <span>{eta ? <>সম্ভাব্য ডেলিভারি <strong>{eta}</strong></> : "ঢাকায় ১–২ দিন · ঢাকার বাইরে ২–৩ দিন"}</span>
                      <b>{deliveryCharge ? money(deliveryCharge) : "ফ্রি"}</b>
                    </div>
                  </section>

                  <div className="skx-amounts">
                    <div><span>পণ্যের দাম</span><strong>{money(bundle.price)}</strong></div>
                    <div>
                      <span>ডেলিভারি চার্জ{qualifiesForFreeDelivery ? <small>{freeDeliveryReason}</small> : null}</span>
                      <strong>{deliveryCharge ? money(deliveryCharge) : "ফ্রি"}</strong>
                    </div>
                    <div className="skx-grand">
                      <span>সর্বমোট<small>হাতে পেয়ে পরিশোধ করবেন</small></span>
                      <strong>{money(total)}</strong>
                    </div>
                  </div>

                  {orderError ? <div className="skx-error" role="alert">{orderError}</div> : null}
                  {protectionDecision === "block" ? <OrderProtectionMessage decision="block" retryable={protectionRetryable} /> : null}
                  <TurnstileChallenge onToken={setTurnstileToken} resetSignal={resetTurnstileSignal} />

                  <button type="submit" disabled={orderSubmitting} className="skx-submit">
                    <span>{orderSubmitting ? "অর্ডার পাঠানো হচ্ছে…" : "অর্ডার নিশ্চিত করুন"}</span>
                    <span className="skx-submit-end">{money(total)} <ArrowUpRight aria-hidden="true" /></span>
                  </button>
                  <p className="skx-submit-help">কনফার্ম করতে আমরা আপনাকে ফোন করব।</p>
                  <p className="skx-terms">
                    অর্ডার করে আপনি আমাদের{" "}
                    <a href="/terms-and-conditions" target="_blank" rel="noopener">শর্তাবলি</a> ও{" "}
                    <a href="/refund-return-exchange" target="_blank" rel="noopener">রিটার্ন নীতিমালা</a>{" "}
                    মেনে নিচ্ছেন।
                  </p>
                  <details className="skx-policy">
                    <summary>ডেলিভারি ও ফেরত নীতি <ChevronDown aria-hidden="true" /></summary>
                    <ul>
                      {checkoutPolicyPoints.map((point) => (
                        <li key={point}><Check aria-hidden="true" /><span>{point}</span></li>
                      ))}
                    </ul>
                  </details>
                  <div className="skx-signoff">
                    <span>বিশ্বাসের সঙ্গে,</span>
                    <b>সেরা খাবার</b>
                    <img src="/home/leaf-mark.webp" alt="" width={30} height={30} />
                  </div>
                </form>
              </article>
              <PaperClip layer="front" />
            </div>
          </>
        )}
      </main>

      <footer className="skx-footer">
        <p>অর্ডার করতে সমস্যা হচ্ছে?</p>
        <a href="tel:+8801310980289"><Phone aria-hidden="true" />ফোনে অর্ডার · 01310-980289</a>
        <a href={`https://wa.me/8801303103540?text=${encodeURIComponent(whatsappOrderText)}`} target="_blank" rel="noopener noreferrer">
          <img src="https://cdn.reicon.dev/logos/whatsapp/original.svg" alt="" width={16} height={16} />
          হোয়াটসঅ্যাপে অর্ডার
        </a>
        <span>সেরা খাবার · নওহাটা, রাজশাহী</span>
      </footer>
    </div>,
    document.body,
  );
}
