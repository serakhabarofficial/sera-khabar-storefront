import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { OrderProtectionError } from "@/lib/order-protection-errors";
import { useCheckoutProtectionSignals } from "@/lib/order-protection";
import { OrderProtectionMessage } from "@/components/order-protection-message";
import { TurnstileChallenge } from "@/components/turnstile-challenge";
import { normalizeBdMobile } from "../../../shared/bd-phone";
import { OrderHoldConfirmation } from "@/components/order-hold-confirmation";
import { readAbandonedCartCampaign, type AbandonedCartItem } from "@/lib/abandoned-cart-capture";
import { useAbandonedCartCapture } from "@/hooks/use-abandoned-cart-capture";
import { trackMerchantSuiteEvent } from "@/lib/merchant-suite";
import { bundleHasFreeDeliveryProduct, bundleHasLitchiFlowerHoney } from "@/lib/free-delivery";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent, type GoogleAnalyticsItem } from "@/lib/google-analytics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

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
  bundle,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle: OrderDialogBundle | null;
  onSuccess?: () => void;
}) {
  const [openInstance, setOpenInstance] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(100);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [orderClosing, setOrderClosing] = useState(false);
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
    if (!previousOpen.current && open) {
      setOpenInstance((current) => current + 1);
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
      setOrderClosing(true);
      onOpenChange(false);
      return;
    }

    setOrderClosing(false);
    onOpenChange(nextOpen);
    setDeliveryCharge(100);
    setOrderSubmitted(false);
    setOrderSubmitting(false);
    setOrderError("");
    setOrderRef("");
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
      setOrderRef(result.orderRef);
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
    <Dialog open={open || orderClosing} onOpenChange={resetDialog}>
      {(open || orderClosing) && bundle && (
        <DialogContent
          forceMount
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="max-md:fixed max-md:inset-0 max-md:!left-0 max-md:!top-0 max-md:!translate-x-0 max-md:!translate-y-0 max-md:w-full max-md:h-auto max-md:max-h-none overflow-hidden rounded-none border-none !bg-transparent p-3 sm:p-4 shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none md:bottom-auto md:top-[50%] md:h-auto md:max-h-[92dvh] md:translate-y-[-50%] md:max-w-[760px] md:p-0 md:bg-[#f6f6f6] md:shadow-[0_80px_180px_rgba(0,0,0,0.28)] [&>button]:hidden md:[&>button]:flex md:[&>button]:rounded-[8px] flex flex-col z-[100]"
        >
          <AnimatePresence
            initial={true}
            onExitComplete={() => setOrderClosing(false)}
          >
            {open && (
              <motion.div
                key={openInstance}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.96,
                  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
                }}
                className={`relative flex w-full h-full md:h-auto max-md:rounded-[12px] bg-white md:bg-[#f6f6f6] max-md:shadow-2xl overflow-y-auto overflow-x-hidden z-[10] ${
                  orderSubmitted
                    ? "min-h-[calc(100dvh-1.5rem)] flex-col items-center justify-center p-6 md:min-h-[560px] md:p-10"
                    : "flex-col p-6 md:p-10"
                }`}
              >
                <div className="absolute top-4 right-4 z-50 md:hidden">
                  <Button variant="ghost" size="icon" onClick={() => resetDialog(false)} className="rounded-full hover:bg-black/5 text-black border-none h-10 w-10">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              <DialogHeader className={orderSubmitted ? "sr-only" : "items-center pb-2 text-center"}>
                <DialogTitle className="text-3xl md:text-4xl font-semibold tracking-tight leading-none text-black">
                  Place Order
                </DialogTitle>
              </DialogHeader>

              {orderSubmitted ? (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.09, delayChildren: 0.05 },
                    },
                  }}
                  className="flex w-full flex-1 flex-col items-center justify-center px-2 py-12 text-center font-sans md:py-16"
                >
                  <motion.span
                    variants={{
                      hidden: { opacity: 0, scaleX: 0 },
                      visible: {
                        opacity: 1,
                        scaleX: 1,
                        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                    className="mx-auto mb-7 block h-px w-16 origin-center bg-black/15"
                  />
                  <motion.h3
                    variants={{
                      hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
                      visible: {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                    className="font-sans text-3xl font-semibold tracking-[-0.04em] text-black md:text-4xl"
                  >
                    Order Confirmed - অর্ডার কনফার্ম
                  </motion.h3>
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                    className="mx-auto mt-4 max-w-sm text-[15px] font-medium leading-7 tracking-[-0.02em] text-black/55"
                  >
                    Our studio team will contact you shortly to confirm delivery and payment. - আমাদের টিম শীঘ্রই ডেলিভারি ও পেমেন্ট কনফার্ম করতে যোগাযোগ করবে।
                  </motion.p>
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 16, scale: 0.97 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                    className="mt-7 flex flex-col items-center gap-6"
                  >
                    {orderRef && (
                      <div className="inline-flex flex-col items-center gap-1 rounded-[8px] border border-black/10 bg-black/[0.03] px-6 py-3">
                        <span className="text-[11px] font-medium tracking-[-0.01em] text-black/45">
                          Order Number - অর্ডার নম্বর
                        </span>
                        <span className="font-sans text-sm font-semibold tracking-[-0.02em] text-black">
                          {orderRef}
                        </span>
                      </div>
                    )}
                    <Button
                      onClick={() => resetDialog(false)}
                      className="h-auto rounded-[8px] bg-black px-7 py-3 text-[13px] font-semibold tracking-[-0.02em] text-white shadow-none hover:bg-black/80"
                    >
                      Close - বন্ধ
                    </Button>
                  </motion.div>
                </motion.div>
               ) : protectionDecision === "review" ? (
                 <div className="flex flex-1 flex-col items-center justify-center">
                   <OrderHoldConfirmation />
                   <Button type="button" onClick={() => resetDialog(false)} className="mt-6 rounded-[8px] bg-black px-7 py-3 text-white">
                     Close - বন্ধ
                   </Button>
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
                  className="mt-6 space-y-6"
                  noValidate
                >
                  <input name="hp_x7" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" className="absolute -left-[9999px] h-px w-px opacity-0" />
                  <section aria-label="Your order - আপনার অর্ডার" className="rounded-[12px] bg-black/[0.035] p-2">
                    <div className="flex items-baseline justify-between px-2 pb-2 pt-1">
                      <span className="text-[13px] font-semibold text-black">
                        Your Order - আপনার অর্ডার
                      </span>
                      <span className="text-[11px] font-medium text-black/50">
                        {lineItemCount} {lineItemCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {lineItems.map((item, index) => (
                        <li
                          key={`${item.name}-${item.details}-${index}`}
                          className="flex items-center gap-3 rounded-[10px] bg-white p-2.5 pr-3.5"
                        >
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#f3f1ee] p-1.5">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-contain mix-blend-multiply"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-3 text-[14px] font-semibold leading-snug text-black">
                              {item.name}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-black/60">
                              {item.details ? (
                                <span className="rounded-[6px] bg-black/[0.05] px-1.5 py-0.5">{item.details}</span>
                              ) : null}
                              <span className="rounded-[6px] bg-black/[0.05] px-1.5 py-0.5">Qty {item.quantity}</span>
                              {item.quantity > 1 ? (
                                <span className="tabular-nums">৳{item.unitPrice.toLocaleString()} each</span>
                              ) : null}
                            </div>
                          </div>
                          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-black">
                            ৳{(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-[13px] md:text-[14px] font-semibold text-black">
                        Name - নাম
                      </span>
                      <input
                        required
                        name="name"
                        className="h-12 w-full rounded-[8px] border border-black/15 bg-white/70 px-4 text-[16px] font-normal outline-none transition-colors focus:border-black max-md:rounded-[8px]"
                        placeholder="Your name"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[13px] md:text-[14px] font-semibold text-black">
                        Phone - ফোন
                      </span>
                      <input
                        required
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={20}
                        className="h-12 w-full rounded-[8px] border border-black/15 bg-white/70 px-4 text-[16px] font-normal outline-none transition-colors focus:border-black max-md:rounded-[8px]"
                        placeholder="01XXXXXXXXX"
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                      <span className="text-[13px] md:text-[14px] font-semibold text-black">
                        Address - ঠিকানা
                      </span>
                    <textarea
                      required
                      name="address"
                      rows={2}
                      className="w-full resize-none rounded-[8px] border border-black/15 bg-white/70 px-4 py-3 text-[16px] font-normal max-md:text-[13px] outline-none transition-colors focus:border-black max-md:rounded-[8px]"
                        placeholder="House, road, area, city - বাড়ি, রাস্তা, এলাকা, শহর"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid content-start gap-2">
                      <span className="text-[13px] md:text-[14px] font-semibold text-black">
                        Delivery Charge - ডেলিভারি চার্জ
                      </span>
                    {qualifiesForFreeDelivery ? (
                      <div className="border border-brand-gold/40 bg-white max-md:bg-white/10 p-4">
                          <span className="block text-[10px] font-bold text-black">
                            Free Delivery - ফ্রি ডেলিভারি
                          </span>
                        <span className="mt-2 block font-garet text-2xl font-bold text-brand-gold">
                          ৳0
                        </span>
                        <span className="mt-3 block text-[9px] leading-5 text-black/45">
                          {isLitchiFlowerHoney
                            ? "Free delivery on Litchi Flower Honey"
                            : hasFreeDeliveryProduct
                              ? "Free delivery on Black Seed Flower Honey"
                              : "Applied automatically for orders over ৳2600"}
                        </span>
                      </div>
                    ) : (
                       <div className="grid gap-2 max-md:gap-1.5">
                        {deliveryOptions.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => setDeliveryCharge(option.charge)}
                           className={`border px-3 py-2 text-left max-md:px-2.5 max-md:py-1.5 transition-all md:h-[88px] ${
                              deliveryCharge === option.charge
                                ? "border-brand-gold border-[1.5px] bg-brand-gold/5 rounded-[8px]"
                                : "border-black/15 bg-transparent hover:border-black/30 rounded-[8px]"
                            }`}
                          >
                           <span className="block text-[10px] font-bold max-md:text-[9px]">
                             {option.label} - {option.bn}
                           </span>
                            <span className="mt-2 block font-garet text-2xl font-bold max-md:mt-1 max-md:text-xl">
                              ৳{option.charge}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid content-start gap-2">
                    <span className="text-[13px] md:text-[14px] font-semibold text-black">
                      Payment Method - পেমেন্ট পদ্ধতি
                    </span>
                    <div className="grid gap-2 md:h-full">
                      {[
                        { value: "cash_on_delivery" as const, label: "Cash on Delivery", bn: "ক্যাশ অন ডেলিভারি" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentMethod(option.value)}
                            className={`border px-3 py-2 text-left max-md:px-2.5 max-md:py-1.5 transition-all md:h-[88px] ${
                            paymentMethod === option.value
                              ? "border-brand-gold border-[1.5px] bg-brand-gold/5 rounded-[8px]"
                              : "border-black/15 bg-transparent hover:border-black/30 rounded-[8px]"
                          }`}
                        >
                           <span className="flex min-h-9 items-center justify-center text-center text-[10px] font-bold">
                             {option.label} - {option.bn}
                           </span>
                        </button>
                      ))}
                    </div>

                  </div>

                  </div>

                  {orderError && (
                    <div className="border border-red-500/30 bg-red-50 px-4 py-3 text-[10px] leading-5 text-black">
                      {orderError}
                    </div>
                  )}

                   {protectionDecision === "block" ? <OrderProtectionMessage decision="block" retryable={protectionRetryable} /> : null}
                   <TurnstileChallenge onToken={setTurnstileToken} resetSignal={resetTurnstileSignal} />

                  <div className="bg-black/5 rounded-[12px] p-5">
                    <div className="flex justify-between text-[11px] text-black/60 font-medium">
                      <span>Items - আইটেম</span>
                      <span className="font-semibold text-black">৳{bundle.price.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 flex justify-between text-[11px] text-black/60 font-medium">
                      <span>Delivery - ডেলিভারি</span>
                      <span className="font-semibold text-black">
                        {deliveryCharge === null ? "Select - সিলেক্ট" : deliveryCharge === 0 ? "Free - ফ্রি" : `৳${deliveryCharge}`}
                      </span>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-black/10 pt-5">
                        <span className="text-[12px] font-bold text-black">
                          Total - মোট
                        </span>
                      {deliveryCharge === null ? (
                        <span className="max-w-[220px] text-right text-[10px] leading-5 font-semibold text-red-600">
                          Please select a delivery charge - ডেলিভারি চার্জ সিলেক্ট করুন
                        </span>
                      ) : (
                        <span className="text-4xl font-semibold tracking-tight text-black leading-none">
                          ৳{(bundle.price + deliveryCharge).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className="flex h-14 w-full items-center justify-center rounded-[6px] bg-[#FBBB14] px-4 text-black shadow-[0_2px_6px_rgba(0,0,0,0.06)] ring-1 ring-black/5 transition-[background-color,transform] duration-150 hover:bg-[#f5b000] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="truncate text-center text-[15px] font-bold tracking-[-0.01em]">
                      {orderSubmitting ? "Placing Order... - অর্ডার হচ্ছে..." : "Place Order - অর্ডার করুন"}
                    </span>
                  </button>

                  <div className="space-y-3">
                    <p className="text-center leading-5">
                      <span className="block text-[13px] font-semibold text-black">
                        অর্ডার করতে সমস্যা হচ্ছে?
                      </span>
                      <span className="block text-[12px] font-medium text-black/55">
                        আমরা সবসময় আপনাকে সাহায্য করতে প্রস্তুত
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <a
                        href="tel:+8801310980289"
                        className="flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#f26b4f] px-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#d9573d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f26b4f]/40"
                      >
                        <Phone className="h-4 w-4 stroke-[1.75px]" aria-hidden="true" />
                        ফোনে অর্ডার
                      </a>
                      <a
                        href={`https://wa.me/8801303103540?text=${encodeURIComponent(whatsappOrderText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#25d366] px-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#1da851] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/40"
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

                  <div className="space-y-2.5 border-t border-black/10 pt-4">
                    <p className="text-[12px] font-semibold text-black">
                      অর্ডার করার আগে জেনে নিন
                    </p>
                    <ul className="space-y-1.5">
                      {checkoutPolicyPoints.map((point) => (
                        <li key={point} className="flex gap-2 text-[11px] leading-5 text-black/60">
                          <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-brand-gold" aria-hidden="true" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] leading-5 text-black/45">
                      অর্ডার করে আপনি আমাদের{" "}
                      <a href="/terms-and-conditions" target="_blank" rel="noopener" className="font-medium text-black/70 underline underline-offset-2">শর্তাবলি</a> ও{" "}
                      <a href="/refund-return-exchange" target="_blank" rel="noopener" className="font-medium text-black/70 underline underline-offset-2">রিটার্ন নীতিমালা</a>{" "}
                      মেনে নিচ্ছেন।
                    </p>
                  </div>
                </form>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      )}
    </Dialog>
  );
}
