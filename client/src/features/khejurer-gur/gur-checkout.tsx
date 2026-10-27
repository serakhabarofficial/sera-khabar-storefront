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
import { buildProductSrcSetIndex, getProductGallery, type StorefrontProduct, type StorefrontProductInventory } from "@/lib/storefront-products";
import { getLandingPackOptions, type LandingPackOption } from "@/features/landing/order";
import type { LandingCheckoutStatus } from "@/features/landing/checkout-state";
import { WhatsAppBrandIcon } from "@/features/landing/campaign-layout";
import { normalizeBdMobile } from "../../../../shared/bd-phone";
import { MAX_LINE_QUANTITY } from "../../../../shared/order-limits";
import { saveGurConfirmation, type GurOrderLine } from "./confirmation";
import { GUR_DELIVERY_CHARGE, GUR_PATH, GUR_PHONE_HREF, GUR_PHONE_LABEL, GUR_THANK_YOU_PATH, GUR_WHATSAPP_HREF, bn, reducedMotion, taka, type GurProductMeta } from "./content";

const AVAILABILITY_ERROR = "বেছে নেওয়া গুড়ের কোনোটি এখন অর্ডারের জন্য পাওয়া যাচ্ছে না। অন্যটি বেছে নিন বা আমাদের কল করুন।";
const PICK_ERROR = "অন্তত একটি গুড় ও পরিমাণ বেছে নিন।";
const toLatinDigits = (value: string) => value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
type Values = { name: string; phone: string; address: string };
type Field = keyof Values;
type Errors = Partial<Record<Field | "pack", string>>;

/** One গুড় on the memo: its catalog product (with stock merged in), orderable packs and a live refresh. */
export type GurOffer = {
  meta: GurProductMeta;
  product: StorefrontProduct | null;
  packs: LandingPackOption[];
  status: LandingCheckoutStatus;
  refresh: () => Promise<{ product: StorefrontProduct | null; inventory: StorefrontProductInventory | undefined; isError: boolean }>;
};
/** variantId → quantity for every pack on the memo. */
export type GurLines = Record<string, number>;
type Row = { offer: GurOffer; product: StorefrontProduct; pack: LandingPackOption };
type Props = { offers: GurOffer[]; lines: GurLines; setLines: (update: (current: GurLines) => GurLines) => void; onRetry: () => void };

function SupportActions() {
  return <><a href={GUR_PHONE_HREF}><Phone aria-hidden="true" />{GUR_PHONE_LABEL}</a><a href={GUR_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"><WhatsAppBrandIcon />হোয়াটসঅ্যাপ</a></>;
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
      running.add(node.animate([{ transform: `translateY(${40 * dir}%)`, opacity: 0, filter: "blur(2px)" }, { transform: "translateY(0)", opacity: 1, filter: "blur(0)" }], { duration: 220, easing: "cubic-bezier(0.23,1,0.32,1)", fill: "forwards" }));
    };
    return () => { running.forEach((animation) => { animation.onfinish = null; animation.cancel(); }); };
  }, [total]);
  return <span ref={ref} className="v1-roll" />;
}

/** Snap strip of the three গুড়' catalog photos (each product's first image) with round thumbnails. */
function MemoGallery({ offers }: { offers: GurOffer[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const photos = useMemo(() => offers.flatMap(({ meta, product }) => {
    if (!product) return [];
    const src = getProductGallery(product)[0];
    return src ? [{ src, srcSet: buildProductSrcSetIndex(product)[src], alt: meta.name }] : [];
  }), [offers]);
  const goTo = (i: number) => { const node = rail.current; node?.scrollTo({ left: i * node.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" }); };
  if (!photos.length) return null;
  return <div className="v1-gal">
    <div ref={rail} className="v1-gal-rail" role="region" aria-label="খেজুরের গুড়ের ছবি" tabIndex={0} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / Math.max(e.currentTarget.clientWidth, 1)))}>
      {photos.map((photo, i) => <div key={photo.src} className="v1-gal-slide"><img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 860px) 480px, 90vw" alt={photo.alt} width={960} height={960} loading={i ? "lazy" : "eager"} decoding="async" draggable={false} /></div>)}
    </div>
    {photos.length > 1 && <div className="v1-gal-capsule">{photos.map((photo, i) => <button key={photo.src} type="button" onClick={() => goTo(i)} aria-label={`${photo.alt}-এর ছবি`} aria-current={active === i}><img src={photo.src} srcSet={photo.srcSet} sizes="38px" alt="" width={38} height={38} draggable={false} decoding="async" /></button>)}</div>}
  </div>;
}

export function GurCheckout({ offers, lines, setLines, onRetry }: Props) {
  const [, setLocation] = useLocation();
  const capture = useAbandonedCartCapture("landing", "khejurer_gur", (currentLandingPagePath() ?? GUR_PATH).toLowerCase(), { partialContact: true });
  const rows = useMemo<Row[]>(() => offers.flatMap((offer) => offer.product && offer.status === "ready" ? offer.packs.map((pack) => ({ offer, product: offer.product!, pack })) : []), [offers]);
  const loading = !rows.length && offers.some((o) => o.status === "loading");
  const chosen = rows.filter((row) => (lines[row.pack.variantId] ?? 0) > 0);
  const [values, setValues] = useState<Values>({ name: "", phone: "", address: "" });
  const valuesRef = useRef(values); valuesRef.current = values;
  const [errors, setErrors] = useState<Errors>({});
  const [announcement, setAnnouncement] = useState("");
  const [requestError, setRequestError] = useState(false);
  const [pending, setPending] = useState(false);
  const [decision, setDecision] = useState<"review" | "block" | null>(null);
  const [retryable, setRetryable] = useState(true);
  const submitting = useRef(false), viewed = useRef(false), began = useRef(false), visitSent = useRef(false);
  const { formHandlers, trackPhoneCandidate, buildProtectionPayload, resetTurnstileSignal, resetTurnstile, setTurnstileToken } = useCheckoutProtectionSignals();
  const refs = { name: useRef<HTMLInputElement>(null), phone: useRef<HTMLInputElement>(null), address: useRef<HTMLTextAreaElement>(null) };
  const subtotal = chosen.length ? chosen.reduce((sum, row) => sum + row.pack.unitPrice * lines[row.pack.variantId], 0) : null;
  const total = subtotal === null ? null : subtotal + GUR_DELIVERY_CHARGE;
  // No জেলা on this form, so the window spans Dhaka (1–2 days) and outside Dhaka (2–3 days).
  const eta = useMemo(() => formatDeliveryWindow(1, 3), []);
  const item = (row: Row, quantity: number) => toGoogleAnalyticsItem({ id: row.product.id, name: row.product.name, variant: row.pack.label, price: row.pack.unitPrice, quantity });

  const snapshot = (current = valuesRef.current) => !chosen.length || subtotal === null || total === null ? null : ({
    customerName: current.name, phone: toLatinDigits(current.phone), address: current.address.trim(),
    items: chosen.map((row) => ({ productName: row.product.name, variantName: row.pack.label, quantity: lines[row.pack.variantId], unitPrice: row.pack.unitPrice })),
    subtotal, deliveryRate: GUR_DELIVERY_CHARGE, total, campaign: readAbandonedCartCampaign(window.location.search),
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
  // Some in-app browsers autofill a field without firing an input event, so read the boxes themselves.
  const syncAutofill = () => {
    for (const field of ["name", "phone", "address"] as Field[]) {
      const value = refs[field].current?.value;
      if (value === undefined || value === valuesRef.current[field]) continue;
      if (field === "phone") trackPhoneCandidate(toLatinDigits(value));
      setField(field, value);
    }
  };
  // A visit that leaves the form empty still tells the Suite which browser came by; the Suite fills it
  // from that browser's last order, or drops it for a first-time visitor.
  const sendReturningVisit = () => {
    if (visitSent.current) return;
    syncAutofill();
    const current = valuesRef.current;
    if (current.name.trim() || current.phone.trim() || current.address.trim()) { visitSent.current = true; return; }
    const value = snapshot();
    if (!value) return;
    visitSent.current = true;
    if (capture.capture({ ...value, returningVisit: true })) capture.flushPending();
  };
  const latest = useRef({ syncAutofill, sendReturningVisit });
  latest.current = { syncAutofill, sendReturningVisit };
  const beginCheckout = () => {
    if (began.current || !chosen.length || subtotal === null) return;
    began.current = true;
    warmOrderConfirmedArt();
    trackMerchantSuiteEvent("checkout");
    trackGoogleEcommerceEvent("begin_checkout", { pageType: "checkout", value: subtotal, items: chosen.map((row) => item(row, lines[row.pack.variantId])) });
  };
  useEffect(() => {
    if (viewed.current || !rows.length) return;
    viewed.current = true;
    const firsts = offers.flatMap((offer) => rows.filter((row) => row.offer === offer).slice(0, 1));
    trackGoogleEcommerceEvent("view_item", { pageType: "product", value: firsts.reduce((sum, row) => sum + row.pack.unitPrice, 0), items: firsts.map((row) => item(row, 1)) });
  }, [rows]);
  useEffect(() => { updateCapture(); }, [values, lines, rows]);
  useEffect(() => {
    const sync = () => latest.current.syncAutofill();
    const timers = [250, 1000, 2500].map((delay) => window.setTimeout(sync, delay));
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);
  const visitReady = chosen.length > 0;
  useEffect(() => {
    if (!visitReady || visitSent.current) return;
    const send = () => latest.current.sendReturningVisit();
    const timer = window.setTimeout(send, 10_000);
    const sendWhenHidden = () => { if (document.visibilityState === "hidden") send(); };
    window.addEventListener("pagehide", send);
    document.addEventListener("visibilitychange", sendWhenHidden);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", send);
      document.removeEventListener("visibilitychange", sendWhenHidden);
    };
  }, [visitReady]);

  const toggle = (row: Row, on: boolean) => {
    setLines((current) => ({ ...current, [row.pack.variantId]: on ? Math.max(1, current[row.pack.variantId] ?? 0) : 0 }));
    setErrors((current) => ({ ...current, pack: undefined }));
    if (on) trackGoogleEcommerceEvent("select_item", { pageType: "product", value: row.pack.unitPrice, items: [item(row, 1)] });
  };
  const step = (row: Row, delta: number) => {
    beginCheckout();
    setLines((current) => ({ ...current, [row.pack.variantId]: Math.min(MAX_LINE_QUANTITY, Math.max(0, (current[row.pack.variantId] ?? 0) + delta)) }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const current = valuesRef.current;
    const nextErrors: Errors = validateCheckout({ ...current, district: null, thana: null });
    if (!chosen.length) nextErrors.pack = rows.length ? PICK_ERROR : AVAILABILITY_ERROR;
    setErrors(nextErrors);
    setRequestError(false);
    if (Object.values(nextErrors).some(Boolean)) {
      if (nextErrors.pack) document.getElementById("gur-packs")?.focus();
      else refs[(["name", "phone", "address"] as Field[]).find((field) => nextErrors[field])!].current?.focus();
      return;
    }
    beginCheckout();
    const honeypot = String(new FormData(event.currentTarget).get("hp_x7") || "");
    const draftKey = updateCapture(); flushCapture();
    submitting.current = true; setPending(true); setDecision(null);
    setAnnouncement("গুড়ের সর্বশেষ দাম ও স্টক যাচাই করা হচ্ছে।");
    try {
      // Re-read every chosen product and its stock; never order against a stale price.
      const fresh = await Promise.all(Array.from(new Set(chosen.map((row) => row.offer))).map(async (offer) => [offer, await offer.refresh()] as const));
      if (fresh.some(([, result]) => result.isError)) throw new Error("refresh-failed");
      const confirmed: Array<{ row: Row; quantity: number }> = [];
      for (const row of chosen) {
        const quantity = lines[row.pack.variantId];
        const result = fresh.find(([offer]) => offer === row.offer)![1];
        const freshPack = result.product ? getLandingPackOptions(result.product).find((p) => p.variantId === row.pack.variantId) : undefined;
        const stock = result.inventory?.inventory?.variants[row.pack.variantId];
        if (!result.product || !freshPack || !stock || stock.available === false || stock.stock_quantity < quantity) {
          setErrors({ pack: AVAILABILITY_ERROR }); setAnnouncement(AVAILABILITY_ERROR); document.getElementById("gur-packs")?.focus(); return;
        }
        if (freshPack.unitPrice !== row.pack.unitPrice) { setAnnouncement("গুড়ের দাম আপডেট হয়েছে। নতুন মোট দেখে আবার অর্ডার নিশ্চিত করুন।"); return; }
        confirmed.push({ row: { ...row, product: result.product, pack: freshPack }, quantity });
      }
      const productTotal = confirmed.reduce((sum, { row, quantity }) => sum + row.pack.unitPrice * quantity, 0);
      const landingPagePath = currentLandingPagePath();
      const payload = {
        bundleTitle: "খেজুরের গুড়", bundleDetails: confirmed.map(({ row, quantity }) => `${row.offer.meta.name} ${row.pack.label} × ${bn(quantity)}`).join(", ").slice(0, 300),
        bundlePrice: productTotal, quantity: confirmed.reduce((sum, { quantity }) => sum + quantity, 0), deliveryCharge: GUR_DELIVERY_CHARGE,
        customerName: current.name.trim(), phone: normalizeBdMobile(toLatinDigits(current.phone))!, address: current.address.trim(),
        paymentMethod: "cash_on_delivery" as const,
        items: confirmed.map(({ row, quantity }) => ({ productId: String(row.product.id), variantId: row.pack.variantId, quantity })),
        ...buildProtectionPayload(honeypot), ...(landingPagePath ? { landingPagePath } : {}), ...(draftKey ? { draftKey } : {}),
      };
      const response = await apiRequest("POST", "/api/orders", payload);
      const result = await response.json() as { orderRef?: unknown; decision?: unknown };
      if (response.status === 202 && result.decision === "review") {
        setDecision("review"); setAnnouncement("আপনার অর্ডারের তথ্য পাওয়া গেছে। আমাদের টিম ফোনে নিশ্চিত করবে।"); capture.clear(); return;
      }
      if (response.status !== 201) throw new Error("unexpected-order-response");
      if (typeof result.orderRef !== "string" || !result.orderRef.trim()) throw new Error("missing-order-reference");
      const items: GurOrderLine[] = confirmed.map(({ row, quantity }) => ({ productId: String(row.product.id), productName: row.product.name, variantLabel: row.pack.label, quantity, unitPrice: row.pack.unitPrice }));
      saveGurConfirmation({ orderRef: result.orderRef.trim(), items, subtotal: productTotal, deliveryCharge: GUR_DELIVERY_CHARGE, total: productTotal + GUR_DELIVERY_CHARGE, customerName: payload.customerName, phone: payload.phone, address: payload.address });
      capture.clear(); trackMerchantSuiteEvent("purchased"); setLocation(GUR_THANK_YOU_PATH);
    } catch (error) {
      if (error instanceof OrderProtectionError) { setDecision("block"); setRetryable(error.retryable); setAnnouncement(error.message); return; }
      setRequestError(true); setAnnouncement("অর্ডারটি পাঠানো যায়নি। আপনার তথ্য ঠিক আছে—আবার চেষ্টা করুন বা আমাদের সঙ্গে যোগাযোগ করুন।");
    } finally { submitting.current = false; setPending(false); resetTurnstile(); }
  };

  const textField = (field: "name" | "phone", label: string, english: string, placeholder: string, hint?: string) => <div className="skx-field">
    <label htmlFor={`gur-${field}`}>{label}<small>{english}</small></label>
    <input ref={refs[field]} id={`gur-${field}`} name={field} type={field === "phone" ? "tel" : "text"} inputMode={field === "phone" ? "tel" : undefined} maxLength={field === "phone" ? 20 : 120} autoComplete={field === "phone" ? "tel" : "name"} placeholder={placeholder} value={values[field]} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `gur-${field}-error` : hint ? `gur-${field}-hint` : undefined} onChange={(e) => { if (field === "phone") trackPhoneCandidate(toLatinDigits(e.target.value)); setField(field, e.target.value); }} />
    {errors[field] ? <span className="skx-field-error" id={`gur-${field}-error`} role="alert">{errors[field]}</span> : hint ? <span className="skx-field-hint" id={`gur-${field}-hint`}>{hint}</span> : null}
  </div>;
  const recovery = !rows.length || errors.pack === AVAILABILITY_ERROR;
  const money = (n: number | null) => n === null ? "—" : taka(n);

  return <div className="skx v1-memo"><div className="skx-main">
    {decision === "review" ? <div className="skx-done skx-hold"><OrderHoldConfirmation /></div> : <>
      <div className="skx-intro"><span className="skx-script">শীতের স্বাদ, ঘরে পৌঁছে দিই</span><p>আপনার পছন্দের খেজুরের গুড় এবার আপনার ঠিকানায়।</p></div>
      <div className="skx-paper-wrap"><PaperClip layer="back" /><article className="skx-paper">
        <div className="skx-paper-head"><img src="/home/leaf-mark.webp" alt="" width={48} height={48} /><div><h2 id="gur-checkout-heading" tabIndex={-1}>অর্ডার মেমো</h2><p>সেরা খাবার · রাজশাহী</p></div><span className="skx-serial" aria-hidden="true">খাতা নং<br /><b>০১</b></span></div>
        <div className="skx-order" onFocusCapture={beginCheckout}>
          <MemoGallery offers={offers} />
          <p className="v1-memo-pick" id="gur-packs-label"><span>গুড় ও পরিমাণ বেছে নিন</span></p>
          <p className="km-note">একাধিক বেছে নিতে পারেন</p>
          <div className="v1-memo-packs" id="gur-packs" role="group" aria-labelledby="gur-packs-label" tabIndex={-1} aria-describedby={errors.pack ? "gur-pack-error" : undefined}>
            {rows.map((row) => {
              const quantity = lines[row.pack.variantId] ?? 0, checked = quantity > 0;
              const cheapest = Math.min(...row.offer.packs.map((p) => p.unitPrice)), compareAt = Number(row.product.compare_at_price);
              const cut = compareAt > row.pack.unitPrice && row.pack.unitPrice === cheapest ? compareAt : 0;
              return <div key={row.pack.variantId} className="v1-memo-pack" data-checked={checked}>
                <label>
                  <input className="sr-only" type="checkbox" checked={checked} disabled={pending} onChange={(e) => { beginCheckout(); toggle(row, e.target.checked); }} />
                  <span className="dot" aria-hidden="true" /><span className="lbl"><b>{row.offer.meta.name}</b> · {row.pack.label}{cut ? <em className="off">{bn(Math.round((1 - row.pack.unitPrice / cut) * 100))}% ছাড়</em> : null}<small>{row.offer.meta.uses}</small></span>
                </label>
                <div className="end">
                  <span className="pr">{taka(row.pack.unitPrice)}{cut ? <s>{taka(cut)}</s> : null}</span>
                  {checked && <div className="skx-qty" role="group" aria-label={`${row.offer.meta.name} ${row.pack.label} পরিমাণ`}><button type="button" aria-label="কমান" disabled={pending} onClick={() => step(row, -1)}>−</button><output aria-live="polite">{bn(quantity)}</output><button type="button" aria-label="বাড়ান" disabled={quantity >= MAX_LINE_QUANTITY || pending} onClick={() => step(row, 1)}>+</button></div>}
                </div>
              </div>;
            })}
          </div>
          {errors.pack && <span id="gur-pack-error" className="skx-field-error" role="alert">{errors.pack}</span>}
          {recovery && <div className="v1-recovery"><p role="status">{loading ? "অর্ডারের তথ্য লোড হচ্ছে…" : AVAILABILITY_ERROR}</p><button type="button" onClick={onRetry}>আবার চেষ্টা করুন</button><SupportActions /></div>}
        </div>
        <form className="skx-form" noValidate onSubmit={handleSubmit} onFocusCapture={(e) => { beginCheckout(); formHandlers.onFocusCapture(e); }} onPasteCapture={formHandlers.onPasteCapture} onBlurCapture={flushCapture}>
          <input name="hp_x7" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" data-1p-ignore data-lpignore="true" data-bwignore data-form-type="other" className="absolute -left-[9999px] h-px w-px opacity-0" />
          <section className="skx-section" aria-label="আপনার নাম, নম্বর ও ঠিকানা">
            <div className="skx-row">{textField("name", "আপনার নাম", "Full name", "আপনার সম্পূর্ণ নাম লিখুন")}{textField("phone", "মোবাইল নম্বর", "Phone number", "01XXXXXXXXX", "এই নম্বরেই অর্ডার কনফার্ম করব।")}</div>
            <div className="skx-field"><label htmlFor="gur-address">সম্পূর্ণ ঠিকানা<small>Delivery address</small></label><textarea ref={refs.address} id="gur-address" name="address" rows={3} maxLength={300} autoComplete="street-address" placeholder="বাড়ি / হোল্ডিং, রাস্তা, এলাকা" value={values.address} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? "gur-address-error" : undefined} onChange={(e) => setField("address", e.target.value)} />{errors.address && <span className="skx-field-error" id="gur-address-error" role="alert">{errors.address}</span>}</div>
          </section>
          <section className="skx-payment" aria-label="পেমেন্ট ও ডেলিভারি"><div className="skx-stamp" aria-hidden="true">আগে অর্ডার<br /><b>পরে পেমেন্ট</b><small>ক্যাশ অন ডেলিভারি</small></div></section>
          <div className="skx-amounts"><div><span>পণ্যের দাম</span><strong>{money(subtotal)}</strong></div><div><span>ডেলিভারি চার্জ<small className="v1-eta">সম্ভাব্য ডেলিভারি <b>{eta}</b></small></span><strong>{taka(GUR_DELIVERY_CHARGE)}</strong></div><div className="skx-grand"><span>সর্বমোট<small>হাতে পেয়ে পরিশোধ করবেন</small></span><strong><RollingTotal total={total} /></strong></div></div>
          <div aria-live="polite" aria-atomic="true">{announcement ? <p className={requestError ? "skx-error" : "skx-field-hint"}>{announcement}</p> : null}</div>
          {decision === "block" && <OrderProtectionMessage decision="block" retryable={retryable} />}
          {requestError && <div className="v1-recovery"><SupportActions /></div>}
          <TurnstileChallenge onToken={setTurnstileToken} resetSignal={resetTurnstileSignal} />
          <button type="submit" className="skx-submit" disabled={pending || !chosen.length}><span>{pending ? "অর্ডার পাঠানো হচ্ছে…" : requestError ? "আবার অর্ডার চেষ্টা করুন" : "অর্ডার নিশ্চিত করুন"}</span><span className="skx-submit-end">{money(total)} <ArrowUpRight aria-hidden="true" /></span></button>
          <p className="v1-pay-line"><Banknote aria-hidden="true" /><span><b>ক্যাশ অন ডেলিভারি</b> · পণ্য হাতে পেয়ে টাকা দেবেন</span></p>
          <p className="skx-submit-help">কনফার্ম করতে আমরা আপনাকে ফোন করব।</p><p className="skx-terms">অর্ডার করে আপনি আমাদের <a href="/terms-and-conditions" target="_blank" rel="noopener">শর্তাবলি</a> ও <a href="/refund-return-exchange" target="_blank" rel="noopener">রিটার্ন নীতিমালা</a> মেনে নিচ্ছেন।</p>
          <details className="skx-policy"><summary>ডেলিভারি ও ফেরত নীতি <ChevronDown aria-hidden="true" /></summary><ul>{["পেমেন্ট শুধু ক্যাশ অন ডেলিভারি।", "ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৩ দিনে ডেলিভারি।", "পণ্যে সমস্যা হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে জানান।"].map((point) => <li key={point}><Check aria-hidden="true" /><span>{point}</span></li>)}</ul></details>
          <div className="skx-signoff"><span>বিশ্বাসের সঙ্গে,</span><b>সেরা খাবার</b><img src="/home/leaf-mark.webp" alt="" width={30} height={30} /></div>
        </form>
      </article><PaperClip layer="front" /></div>
    </>}
  </div></div>;
}
