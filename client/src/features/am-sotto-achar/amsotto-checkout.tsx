import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Banknote, Check, ChevronDown, Phone } from "lucide-react";
import { useLocation } from "wouter";
import { validateCheckout } from "@/components/order-dialog";
import { PaperClip } from "@/components/paper-clip";
import { OrderHoldConfirmation } from "@/components/order-hold-confirmation";
import { warmOrderConfirmedArt } from "@/components/order-confirmed";
import { OrderProtectionMessage } from "@/components/order-protection-message";
import { TurnstileChallenge } from "@/components/turnstile-challenge";
import { useAbandonedCartCapture } from "@/hooks/use-abandoned-cart-capture";
import { readAbandonedCartCampaign } from "@/lib/abandoned-cart-capture";
import { formatDeliveryWindow } from "@/lib/bd-locations";
import { apiRequest } from "@/lib/queryClient";
import { currentLandingPagePath } from "@/lib/landing-page-attribution";
import { trackMerchantSuiteEvent } from "@/lib/merchant-suite";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent } from "@/lib/google-analytics";
import { useCheckoutProtectionSignals } from "@/lib/order-protection";
import { OrderProtectionError } from "@/lib/order-protection-errors";
import { buildProductSrcSetIndex, getProductGallery, mergeInventory, type StorefrontProduct, type StorefrontProductInventory } from "@/lib/storefront-products";
import { getLandingPackOptions, buildLandingOrderConfirmation, type LandingPackOption } from "@/features/landing/order";
import { saveAmsottoConfirmation } from "./confirmation";
import type { LandingCheckoutStatus } from "@/features/landing/checkout-state";
import { WhatsAppBrandIcon } from "@/features/landing/campaign-layout";
import { normalizeBdMobile } from "../../../../shared/bd-phone";
import { MAX_LINE_QUANTITY } from "../../../../shared/order-limits";
import { AMSOTTO_DELIVERY_CHARGE, AMSOTTO_PACK_META, AMSOTTO_PATH, AMSOTTO_PHONE_HREF, AMSOTTO_PHONE_LABEL, AMSOTTO_THANK_YOU_PATH, AMSOTTO_WHATSAPP_HREF, bn, reducedMotion, taka } from "./content";

const AVAILABILITY_ERROR = "এই প্যাকটি এখন অর্ডারের জন্য পাওয়া যাচ্ছে না। অন্য প্যাক বেছে নিন বা আমাদের কল করুন।";
const toLatinDigits = (value: string) => value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
type Values = { name: string; phone: string; address: string };
type Field = keyof Values;
type Errors = Partial<Record<Field | "pack", string>>;
type RefreshQuery<T> = { refetch: () => Promise<{ data: T | undefined; isError: boolean }> };
type Props = { product: StorefrontProduct | null; status: LandingCheckoutStatus; productQuery: RefreshQuery<StorefrontProduct | null>; inventoryQuery: RefreshQuery<StorefrontProductInventory>; onRetry: () => void };

function SupportActions() {
  return <><a href={AMSOTTO_PHONE_HREF}><Phone aria-hidden="true" />{AMSOTTO_PHONE_LABEL}</a><a href={AMSOTTO_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"><WhatsAppBrandIcon />হোয়াটসঅ্যাপ</a></>;
}

function RollingTotal({ total }: { total: number | null }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef<number | null>(null);
  useEffect(() => {
    const node = ref.current!, text = total === null ? "—" : taka(total);
    const previous = last.current;
    last.current = total;
    if (node.textContent === text) return;
    const running = new Set<Animation>();
    if (reducedMotion() || previous === null || total === null) { node.textContent = text; return; }
    const dir = total >= previous ? 1 : -1;
    const out = node.animate([{ transform: "translateY(0)", opacity: 1, filter: "blur(0)" }, { transform: `translateY(${-40 * dir}%)`, opacity: 0, filter: "blur(2px)" }], { duration: 110, easing: "ease-in", fill: "forwards" });
    running.add(out);
    out.onfinish = () => {
      node.textContent = text;
      out.cancel();
      const enter = node.animate([{ transform: `translateY(${40 * dir}%)`, opacity: 0, filter: "blur(2px)" }, { transform: "translateY(0)", opacity: 1, filter: "blur(0)" }], { duration: 220, easing: "cubic-bezier(0.23,1,0.32,1)", fill: "forwards" });
      running.add(enter);
    };
    return () => { running.forEach((animation) => { animation.onfinish = null; animation.cancel(); }); };
  }, [total]);
  return <span ref={ref} className="v1-roll" />;
}

// The product page's gallery: a full-width snap strip with round thumbnails in a cream capsule.
// The landing leads with the in-hand photos: catalog 2nd, then 3rd, then 1st (the white-background shot).
function MemoGallery({ product }: { product: StorefrontProduct | null }) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const photos = useMemo(() => {
    if (!product) return [];
    const srcSets = buildProductSrcSetIndex(product);
    const gallery = getProductGallery(product);
    const ordered = gallery.length > 2 ? [gallery[1], gallery[2], gallery[0], ...gallery.slice(3)] : [...gallery].reverse();
    return ordered.map((src) => ({ src, srcSet: srcSets[src] }));
  }, [product]);
  const goTo = (i: number) => { const node = rail.current; node?.scrollTo({ left: i * node.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" }); };
  if (!photos.length) return null;
  return <div className="v1-gal">
    <div ref={rail} className="v1-gal-rail" role="region" aria-label="আমসত্ত্ব আচারের ছবি" tabIndex={0} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / Math.max(e.currentTarget.clientWidth, 1)))}>
      {photos.map((photo, i) => <div key={photo.src} className="v1-gal-slide"><img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 860px) 480px, 90vw" alt={`আমসত্ত্ব আচার, ছবি ${bn(i + 1)}`} width={960} height={960} loading={i < 3 ? "eager" : "lazy"} fetchPriority={i ? "low" : undefined} decoding="async" draggable={false} /></div>)}
    </div>
    {photos.length > 1 && <div className="v1-gal-capsule">{photos.map((photo, i) => <button key={photo.src} type="button" onClick={() => goTo(i)} aria-label={`ছবি ${bn(i + 1)}`} aria-current={active === i}><img src={photo.src} srcSet={photo.srcSet} sizes="38px" alt="" width={38} height={38} draggable={false} decoding="async" /></button>)}</div>}
  </div>;
}

export function AmsottoCheckout({ product, status, productQuery, inventoryQuery, onRetry }: Props) {
  const [, setLocation] = useLocation();
  // The Suite currently accepts the legacy source enum only. Keep its transport contract,
  // but never share a draft key with the honey campaign. Orders carry landingPagePath below.
  const capture = useAbandonedCartCapture("landing", "am_sotto_achar", (currentLandingPagePath() ?? AMSOTTO_PATH).toLowerCase());
  const livePacks = useMemo(() => product ? getLandingPackOptions(product) : [], [product]);
  const lastPacks = useRef(livePacks);
  if (status === "ready" && livePacks.length) lastPacks.current = livePacks;
  const packs = status === "ready" ? livePacks : lastPacks.current;
  const [variantId, setVariantId] = useState(() => packs[0]?.variantId ?? "");
  const [quantity, setQuantity] = useState(1);
  const [values, setValues] = useState<Values>({ name: "", phone: "", address: "" });
  const valuesRef = useRef(values); valuesRef.current = values;
  const [errors, setErrors] = useState<Errors>({});
  const [announcement, setAnnouncement] = useState("");
  const [requestError, setRequestError] = useState(false);
  const [pending, setPending] = useState(false);
  const [decision, setDecision] = useState<"review" | "block" | null>(null);
  const [retryable, setRetryable] = useState(true);
  const submitting = useRef(false), viewed = useRef(false), began = useRef(false);
  const { formHandlers, trackPhoneCandidate, buildProtectionPayload, resetTurnstileSignal, resetTurnstile, setTurnstileToken } = useCheckoutProtectionSignals();
  const refs = { name: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null), address: useRef<HTMLTextAreaElement>(null) };
  const selected = packs.find((pack) => pack.variantId === variantId);
  const presented = status === "ready" ? selected : undefined;
  const cheapestPrice = Math.min(...packs.map((p) => p.unitPrice));
  const compareAt = Number(product?.compare_at_price);
  const discountPercent = compareAt > cheapestPrice ? Math.round((1 - cheapestPrice / compareAt) * 100) : 0;
  const subtotal = presented ? presented.unitPrice * quantity : null;
  const total = subtotal === null ? null : subtotal + AMSOTTO_DELIVERY_CHARGE;
  // No জেলা on this form, so the window spans Dhaka (1–2 days) and outside Dhaka (2–3 days).
  const eta = useMemo(() => formatDeliveryWindow(1, 3), []);

  const snapshot = (current = valuesRef.current) => !product || !presented || subtotal === null || total === null ? null : ({
    customerName: current.name, phone: toLatinDigits(current.phone), address: current.address.trim(),
    items: [{ productName: product.name, variantName: presented.label, quantity, unitPrice: presented.unitPrice }],
    subtotal, deliveryRate: AMSOTTO_DELIVERY_CHARGE, total, campaign: readAbandonedCartCampaign(window.location.search),
  });
  const updateCapture = (current?: Values) => { const value = snapshot(current); return value ? capture.capture(value) : null; };
  const flushCapture = () => { const value = snapshot(); if (value) void capture.flush(value); };
  const setField = (field: Field, value: string) => {
    const next = { ...valuesRef.current, [field]: value };
    valuesRef.current = next;
    setValues(next);
    setErrors((current) => ({ ...current, [field]: undefined }));
    updateCapture(next);
  };
  const analyticsItem = (pack: LandingPackOption, qty: number) => toGoogleAnalyticsItem({ id: product?.id ?? pack.variantId, name: product?.name ?? "", variant: pack.label, price: pack.unitPrice, quantity: qty });
  const beginCheckout = () => {
    if (began.current || status !== "ready" || !selected || !product) return;
    began.current = true;
    warmOrderConfirmedArt();
    trackMerchantSuiteEvent("checkout");
    trackGoogleEcommerceEvent("begin_checkout", { pageType: "checkout", value: selected.unitPrice * quantity, items: [analyticsItem(selected, quantity)] });
  };
  useEffect(() => {
    if (packs[0] && !packs.some((p) => p.variantId === variantId) && !began.current) setVariantId(packs[0].variantId);
  }, [packs, variantId]);
  useEffect(() => {
    if (viewed.current || status !== "ready" || !selected || !product) return;
    viewed.current = true;
    trackGoogleEcommerceEvent("view_item", { pageType: "product", value: selected.unitPrice, items: [analyticsItem(selected, 1)] });
  }, [product, selected, status]);
  useEffect(() => { updateCapture(); }, [values, quantity, variantId, product, status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const current = valuesRef.current;
    const nextErrors: Errors = validateCheckout({ ...current, district: null, thana: null });
    if (status !== "ready" || !selected) nextErrors.pack = AVAILABILITY_ERROR;
    setErrors(nextErrors);
    setRequestError(false);
    if (Object.values(nextErrors).some(Boolean)) {
      const first = (["name", "phone", "address"] as Field[]).find((field) => nextErrors[field]);
      if (first) refs[first].current?.focus();
      else document.getElementById("amsotto-packs")?.focus();
      return;
    }
    beginCheckout();
    const honeypot = String(new FormData(event.currentTarget).get("hp_x7") || "");
    const draftKey = updateCapture(); flushCapture();
    submitting.current = true; setPending(true); setDecision(null);
    setAnnouncement("প্যাকের সর্বশেষ মূল্য ও স্টক যাচাই করা হচ্ছে।");
    try {
      const [freshProductResult, freshInventoryResult] = await Promise.all([productQuery.refetch(), inventoryQuery.refetch()]);
      if (freshProductResult.isError || freshInventoryResult.isError) throw new Error("refresh-failed");
      const freshProduct = mergeInventory(freshProductResult.data, freshInventoryResult.data?.inventory);
      const freshPack = freshProduct ? getLandingPackOptions(freshProduct).find((p) => p.variantId === variantId) : undefined;
      const freshVariant = freshProduct?.variants?.find((v) => String(v.id) === variantId);
      const freshInventoryVariant = freshInventoryResult.data?.inventory?.variants[variantId];
      if (!freshProduct || !freshPack || !freshVariant || !freshInventoryVariant || freshVariant.available === false || freshInventoryVariant.available === false || freshInventoryVariant.stock_quantity < quantity) {
        setErrors({ pack: AVAILABILITY_ERROR }); setAnnouncement(AVAILABILITY_ERROR);
        document.getElementById("amsotto-packs")?.focus(); return;
      }
      if (freshPack.unitPrice !== selected!.unitPrice) {
        setAnnouncement("প্যাকের দাম আপডেট হয়েছে। নতুন মোট দেখে আবার অর্ডার নিশ্চিত করুন।"); return;
      }
      const landingPagePath = currentLandingPagePath();
      const payload = {
        bundleTitle: freshProduct.name, bundleDetails: freshPack.label, bundlePrice: freshPack.unitPrice * quantity,
        quantity, deliveryCharge: AMSOTTO_DELIVERY_CHARGE, customerName: current.name.trim(),
        phone: normalizeBdMobile(toLatinDigits(current.phone))!, address: current.address.trim(),
        paymentMethod: "cash_on_delivery" as const,
        items: [{ productId: String(freshProduct.id), variantId: freshPack.variantId, quantity }],
        ...buildProtectionPayload(honeypot), ...(landingPagePath ? { landingPagePath } : {}), ...(draftKey ? { draftKey } : {}),
      };
      const response = await apiRequest("POST", "/api/orders", payload);
      const result = await response.json() as { orderRef?: unknown; decision?: unknown };
      if (response.status === 202 && result.decision === "review") {
        setDecision("review"); setAnnouncement("আপনার অর্ডারের তথ্য পাওয়া গেছে। আমাদের টিম ফোনে নিশ্চিত করবে।"); capture.clear(); return;
      }
      if (response.status !== 201) throw new Error("unexpected-order-response");
      if (typeof result.orderRef !== "string" || !result.orderRef.trim()) throw new Error("missing-order-reference");
      const confirmation = buildLandingOrderConfirmation(result.orderRef, payload);
      saveAmsottoConfirmation(confirmation);
      capture.clear(); trackMerchantSuiteEvent("purchased"); setLocation(AMSOTTO_THANK_YOU_PATH);
    } catch (error) {
      if (error instanceof OrderProtectionError) { setDecision("block"); setRetryable(error.retryable); setAnnouncement(error.message); return; }
      setRequestError(true); setAnnouncement("অর্ডারটি পাঠানো যায়নি। আপনার তথ্য ঠিক আছে—আবার চেষ্টা করুন বা আমাদের সঙ্গে যোগাযোগ করুন।");
    } finally { submitting.current = false; setPending(false); resetTurnstile(); }
  };

  const textField = (field: "name" | "phone", label: string, english: string, placeholder: string, hint?: string) => <div className="skx-field">
    <label htmlFor={`amsotto-${field}`}>{label}<small>{english}</small></label>
    <input ref={refs[field]} id={`amsotto-${field}`} name={field} type={field === "phone" ? "tel" : "text"} inputMode={field === "phone" ? "tel" : undefined} maxLength={field === "phone" ? 20 : 120} autoComplete={field === "phone" ? "tel" : "name"} placeholder={placeholder} value={values[field]} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `amsotto-${field}-error` : hint ? `amsotto-${field}-hint` : undefined} onChange={(e) => { if (field === "phone") trackPhoneCandidate(toLatinDigits(e.target.value)); setField(field, e.target.value); }} />
    {errors[field] ? <span className="skx-field-error" id={`amsotto-${field}-error`} role="alert">{errors[field]}</span> : hint ? <span className="skx-field-hint" id={`amsotto-${field}-hint`}>{hint}</span> : null}
  </div>;
  const recovery = status !== "ready" || !selected || errors.pack === AVAILABILITY_ERROR;
  const money = (n: number | null) => n === null ? "—" : taka(n);

  return <div className="skx v1-memo"><div className="skx-main">
    {decision === "review" ? <div className="skx-done skx-hold"><OrderHoldConfirmation /></div> : <>
      <div className="skx-intro"><span className="skx-script">ঘরের স্বাদ, ঘরে পৌঁছে দিই</span><p>আপনার পছন্দের আমসত্ত্ব আচার এবার আপনার ঠিকানায়।</p></div>
      <div className="skx-paper-wrap"><PaperClip layer="back" /><article className="skx-paper">
        <div className="skx-paper-head"><img src="/home/leaf-mark.webp" alt="" width={48} height={48} /><div><h2 id="amsotto-checkout-heading" tabIndex={-1}>অর্ডার মেমো</h2><p>সেরা খাবার · রাজশাহী</p></div><span className="skx-serial" aria-hidden="true">খাতা নং<br /><b>০১</b></span></div>
        <div className="skx-order" onFocusCapture={beginCheckout}>
          <MemoGallery product={product} />
          <p className="v1-memo-pick" id="amsotto-packs-label"><span>পরিমাণ বেছে নিন</span></p>
          <div className="v1-memo-packs" id="amsotto-packs" role="radiogroup" aria-labelledby="amsotto-packs-label" tabIndex={-1} aria-describedby={errors.pack ? "amsotto-pack-error" : undefined}>
            {packs.map((pack) => { const checked = variantId === pack.variantId; return <div key={pack.variantId} className="v1-memo-pack" data-checked={checked}>
              <label>
                <input className="sr-only" type="radio" name="pack" value={pack.variantId} checked={checked} disabled={status !== "ready" || pending} onChange={() => { beginCheckout(); setVariantId(pack.variantId); setErrors((current) => ({ ...current, pack: undefined })); trackGoogleEcommerceEvent("select_item", { pageType: "product", value: pack.unitPrice, items: [analyticsItem(pack, quantity)] }); }} />
                <span className="dot" aria-hidden="true" /><span className="lbl">{pack.label}{status === "ready" && discountPercent > 0 && pack.unitPrice === cheapestPrice ? <em className="off">{bn(discountPercent)}% ছাড়</em> : null}<small>{AMSOTTO_PACK_META[pack.label]?.note}</small></span>
              </label>
              <div className="end">
                <span className="pr">{status === "ready" ? taka(pack.unitPrice) : "—"}{status === "ready" && pack.unitPrice === Math.min(...packs.map((p) => p.unitPrice)) && Number(product?.compare_at_price) > pack.unitPrice ? <s>{taka(Number(product?.compare_at_price))}</s> : null}</span>
                {checked && <div className="skx-qty" role="group" aria-label={`${pack.label} পরিমাণ`}><button type="button" aria-label="কমান" disabled={quantity <= 1 || pending || status !== "ready"} onClick={() => { beginCheckout(); setQuantity((n) => Math.max(1, n - 1)); }}>−</button><output aria-live="polite">{bn(quantity)}</output><button type="button" aria-label="বাড়ান" disabled={quantity >= MAX_LINE_QUANTITY || pending || status !== "ready"} onClick={() => { beginCheckout(); setQuantity((n) => Math.min(MAX_LINE_QUANTITY, n + 1)); }}>+</button></div>}
              </div>
            </div>; })}
          </div>
          {errors.pack && <span id="amsotto-pack-error" className="skx-field-error" role="alert">{errors.pack}</span>}
          {recovery && <div className="v1-recovery"><p role="status">{status === "loading" ? "অর্ডারের তথ্য লোড হচ্ছে…" : AVAILABILITY_ERROR}</p><button type="button" onClick={onRetry}>আবার চেষ্টা করুন</button><SupportActions /></div>}
        </div>
        <form className="skx-form" noValidate onSubmit={handleSubmit} onFocusCapture={(e) => { beginCheckout(); formHandlers.onFocusCapture(e); }} onPasteCapture={formHandlers.onPasteCapture} onBlurCapture={flushCapture}>
          <input name="hp_x7" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" className="absolute -left-[9999px] h-px w-px opacity-0" />
          <section className="skx-section" aria-label="আপনার নাম, নম্বর ও ঠিকানা">
            <div className="skx-row">{textField("name", "আপনার নাম", "Full name", "আপনার সম্পূর্ণ নাম লিখুন")}{textField("phone", "মোবাইল নম্বর", "Phone number", "01XXXXXXXXX", "এই নম্বরেই অর্ডার কনফার্ম করব।")}</div>
            <div className="skx-field"><label htmlFor="amsotto-address">সম্পূর্ণ ঠিকানা<small>Delivery address</small></label><textarea ref={refs.address} id="amsotto-address" name="address" rows={3} maxLength={300} autoComplete="street-address" placeholder="বাড়ি / হোল্ডিং, রাস্তা, এলাকা" value={values.address} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "amsotto-address-error" : undefined} onChange={(e) => setField("address", e.target.value)} />{errors.address && <span className="skx-field-error" id="amsotto-address-error" role="alert">{errors.address}</span>}</div>
          </section>
          <section className="skx-payment" aria-label="পেমেন্ট ও ডেলিভারি"><div className="skx-stamp" aria-hidden="true">আগে অর্ডার<br /><b>পরে পেমেন্ট</b><small>ক্যাশ অন ডেলিভারি</small></div></section>
          <div className="skx-amounts"><div><span>পণ্যের দাম</span><strong>{money(subtotal)}</strong></div><div><span>ডেলিভারি চার্জ<small className="v1-eta">সম্ভাব্য ডেলিভারি <b>{eta}</b></small></span><strong>{taka(AMSOTTO_DELIVERY_CHARGE)}</strong></div><div className="skx-grand"><span>সর্বমোট<small>হাতে পেয়ে পরিশোধ করবেন</small></span><strong><RollingTotal total={total} /></strong></div></div>
          <div aria-live="polite" aria-atomic="true">{announcement ? <p className={requestError ? "skx-error" : "skx-field-hint"}>{announcement}</p> : null}</div>
          {decision === "block" && <OrderProtectionMessage decision="block" retryable={retryable} />}
          {requestError && <div className="v1-recovery"><SupportActions /></div>}
          <TurnstileChallenge onToken={setTurnstileToken} resetSignal={resetTurnstileSignal} />
          <button type="submit" className="skx-submit" disabled={pending || status !== "ready" || !selected}><span>{pending ? "অর্ডার পাঠানো হচ্ছে…" : requestError ? "আবার অর্ডার চেষ্টা করুন" : "অর্ডার নিশ্চিত করুন"}</span><span className="skx-submit-end">{money(total)} <ArrowUpRight aria-hidden="true" /></span></button>
          <p className="v1-pay-line"><Banknote aria-hidden="true" /><span><b>ক্যাশ অন ডেলিভারি</b> · পণ্য হাতে পেয়ে টাকা দেবেন</span></p>
          <p className="skx-submit-help">কনফার্ম করতে আমরা আপনাকে ফোন করব।</p><p className="skx-terms">অর্ডার করে আপনি আমাদের <a href="/terms-and-conditions" target="_blank" rel="noopener">শর্তাবলি</a> ও <a href="/refund-return-exchange" target="_blank" rel="noopener">রিটার্ন নীতিমালা</a> মেনে নিচ্ছেন।</p>
          <details className="skx-policy"><summary>ডেলিভারি ও ফেরত নীতি <ChevronDown aria-hidden="true" /></summary><ul>{["পেমেন্ট শুধু ক্যাশ অন ডেলিভারি।", "ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৩ দিনে ডেলিভারি।", "পণ্যে সমস্যা হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে জানান।"].map((point) => <li key={point}><Check aria-hidden="true" /><span>{point}</span></li>)}</ul></details>
          <div className="skx-signoff"><span>বিশ্বাসের সঙ্গে,</span><b>সেরা খাবার</b><img src="/home/leaf-mark.webp" alt="" width={30} height={30} /></div>
        </form>
      </article><PaperClip layer="front" /></div>
    </>}
  </div></div>;
}
