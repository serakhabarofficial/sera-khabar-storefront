import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { toBanglaDigits } from "@/lib/bangla-digits";

// The dock's contact seal (chosen 2026-10-19, "ঠিক করা"): a scalloped brown seal in the middle of the phone dock
// whose phone rings now and then. Tapping it opens a Stage-style card, revealed in a circle from the seal,
// with phone and WhatsApp ordering. It replaces the phone/WhatsApp row under the product page's buttons on phones.

const PHONE_HREF = "tel:+8801310980289";
const WHATSAPP_NUMBER = "8801303103540";
const WHATSAPP_LOGO = "https://cdn.reicon.dev/logos/whatsapp/original.svg";

export type DockContactProduct = { name: string; whatsappName: string; size: string | null; quantity: number };

// Every page mounts its own Layout, so the product page shares what is being viewed through a tiny store.
let currentProduct: DockContactProduct | null = null;
const listeners = new Set<() => void>();
function setDockContactProduct(product: DockContactProduct | null) {
  currentProduct = product;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lets the dock's contact card name the product, size and quantity being viewed. */
export function useDockContactProduct(product: DockContactProduct | null) {
  const key = product ? JSON.stringify(product) : "";
  useEffect(() => {
    if (!key) return;
    setDockContactProduct(JSON.parse(key) as DockContactProduct);
    return () => setDockContactProduct(null);
  }, [key]);
}

// A circle whose radius ripples 14 times around: the seal's scalloped edge.
function scallop(cx: number, cy: number, radius: number, depth: number, bumps: number) {
  let d = "";
  for (let k = 0; k <= 280; k++) {
    const t = (k / 280) * Math.PI * 2;
    const r = radius + depth * Math.cos(bumps * t);
    d += `${k ? "L" : "M"}${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
  }
  return `${d}Z`;
}
const SEAL_EDGE = scallop(33, 33, 29.5, 2.1, 14);

const HANDSET = "M8 3c0.5 0 2.5 4.5 2.5 5c0 1 -1.5 2 -2 3c-0.5 1 0.5 2 1.5 3c0.39 0.39 2 2 3 1.5c1 -0.5 2 -2 3 -2c0.5 0 5 2 5 2.5c0 2 -1.5 3.5 -3 4c-1.5 0.5 -2.5 0.5 -4.5 0c-2 -0.5 -3.5 -1 -6 -3.5c-2.5 -2.5 -3 -4 -3.5 -6c-0.5 -2 -0.5 -3 0 -4.5c0.5 -1.5 2 -3 4 -3Z";
const WAVE_NEAR = "M15.76 8.28c-0.5 -0.51 -1.1 -0.93 -1.76 -1.24M15.76 8.28c0.49 0.49 0.9 1.08 1.2 1.72";
const WAVE_FAR = "M18.67 5.35c-1 -1 -2.26 -1.73 -3.67 -2.1M18.67 5.35c0.99 1 1.72 2.25 2.08 3.65";

// line-md "phone-call-loop" by Vjacheslav Trushkin (MIT, https://github.com/cyberalien/line-md), slowed to ring
// once every four seconds. With reduced motion it is drawn still.
function RingingPhoneIcon({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d={HANDSET} strokeDasharray={still ? undefined : 62}>
          {!still && <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="62;0" />}
          {!still && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              dur="4s"
              repeatCount="indefinite"
              keyTimes="0;0.024;0.047;0.071;0.095;0.118;0.142;0.165;0.189;1"
              values="0 12 12;15 12 12;0 12 12;-12 12 12;0 12 12;12 12 12;0 12 12;-15 12 12;0 12 12;0 12 12"
            />
          )}
        </path>
        <path d={WAVE_NEAR} strokeDasharray={still ? undefined : 6} strokeDashoffset={still ? undefined : 6}>
          {!still && <animate attributeName="stroke-dashoffset" begin="0.7s" dur="4s" repeatCount="indefinite" keyTimes="0;0.101;0.203;1" values="6;0;6;6" />}
        </path>
        <path d={WAVE_FAR} strokeDasharray={still ? undefined : 8} strokeDashoffset={still ? undefined : 8}>
          {!still && <animate attributeName="stroke-dashoffset" begin="1s" dur="4s" repeatCount="indefinite" keyTimes="0;0.101;0.203;1" values="8;0;8;8" />}
        </path>
      </g>
    </svg>
  );
}

function HandsetIcon() {
  // Material Design Icons by Pictogrammers — https://github.com/Templarian/MaterialDesign/blob/master/LICENSE
  return (
    <svg width="16" height="22" viewBox="7 1 11 22" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M15 2a1 1 0 0 0-1 1v3h-4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h5c1.11 0 2-.89 2-2V8c0-.74-.4-1.38-1-1.72V3a1 1 0 0 0-1-1m-5 6h5v5h-5zm0 7h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm-4 2h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1zm-4 2h1v1h-1zm2 0h1v1h-1zm2 0h1v1h-1z" />
    </svg>
  );
}

export const DOCK_CONTACT_CARD_ID = "sk-contact-card";

/** The seal in the middle of the dock pill. */
export function DockContactSeal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const still = Boolean(useReducedMotion());
  return (
    <button
      type="button"
      className="sk-contact-seal"
      aria-label="যোগাযোগ: ফোন বা হোয়াটসঅ্যাপে অর্ডার"
      aria-expanded={open}
      aria-controls={DOCK_CONTACT_CARD_ID}
      onClick={() => onOpenChange(!open)}
    >
      <svg className="sk-contact-shape" viewBox="0 0 66 66" aria-hidden="true" focusable="false">
        <path d={SEAL_EDGE} />
        <circle cx="33" cy="33" r="23" />
      </svg>
      <span className="sk-contact-ic">
        <RingingPhoneIcon still={still} />
      </span>
      <span className="sk-contact-x">
        <X size={19} strokeWidth={1.9} aria-hidden="true" />
      </span>
    </button>
  );
}

/** The dimmed page and the contact card above the dock. */
export function DockContactCard({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const product = useSyncExternalStore(subscribe, () => currentProduct, () => null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const whatsappHref = product
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        `Hello, I'd like to order: ${product.whatsappName}${product.size ? ` (${product.size})` : ""}${product.quantity > 1 ? ` × ${product.quantity}` : ""}`,
      )}`
    : `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}`;
  const close = () => onOpenChange(false);

  return (
    <>
      <div className="sk-contact-scrim" data-open={open || undefined} onClick={close} aria-hidden="true" />
      <div id={DOCK_CONTACT_CARD_ID} className="stc sk-contact-card" data-open={open || undefined} role="dialog" aria-label="সরাসরি অর্ডার">
        <div className="sk-contact-head sk-contact-in">
          <h3 className="display">
            <b>সরাসরি</b> অর্ডার
          </h3>
          <small>
            {product ? (
              <>
                {product.name}
                {product.size ? ` · ${product.size}` : ""} × <span className="num">{toBanglaDigits(product.quantity)}</span>
              </>
            ) : (
              "ফোন করুন বা হোয়াটসঅ্যাপে মেসেজ দিন"
            )}
          </small>
        </div>
        <div className="sk-contact-rows">
          <a className="sk-contact-row sk-contact-in" style={{ "--i": 1 } as CSSProperties} href={PHONE_HREF} onClick={close}>
            <span className="sk-contact-badge">
              <HandsetIcon />
            </span>
            <span>
              <b>ফোনে অর্ডার</b>
              <small className="num">০১৩১০-৯৮০২৮৯</small>
            </span>
            <i aria-hidden="true">→</i>
          </a>
          <a
            className="sk-contact-row sk-contact-in"
            style={{ "--i": 2 } as CSSProperties}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            <span className="sk-contact-badge">
              <img src={WHATSAPP_LOGO} alt="" width={20} height={20} />
            </span>
            <span>
              <b>হোয়াটসঅ্যাপে অর্ডার</b>
              <small className="num">০১৩০৩-১০৩৫৪০</small>
            </span>
            <i aria-hidden="true">↗</i>
          </a>
        </div>
      </div>
    </>
  );
}
