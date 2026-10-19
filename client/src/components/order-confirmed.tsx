import React, { useEffect, useRef, useState } from "react";
import { Banknote, Check, Copy, Phone, Truck } from "lucide-react";
import { prefersStillArt } from "../lib/alpha-video";

// Approved 2026-10-18 (docs/design/2026-10-18-order-confirmed): the "Celebrate" screen with the kraft bag.
// The bag is a HyperFrames render (order-pack-motion) with a transparent background; its motion is baked in.
// Rename these files when the render changes: public images and video are cached as immutable.
export const ORDER_PACK_VIDEO = "/order/order-kraft-bag-1.webm";
export const ORDER_PACK_STILL = "/order/order-kraft-bag-1.webp";

export type ConfirmedOrder = { ref: string; firstName: string; total: number };

const toBanglaDigits = (value: string) => value.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

let warmed = false;
/** Fetch the bag early (when checkout opens) so it plays straight away after the order goes through. */
export function warmOrderConfirmedArt() {
  if (warmed || typeof document === "undefined") return;
  warmed = true;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = prefersStillArt() ? ORDER_PACK_STILL : ORDER_PACK_VIDEO;
  document.head.append(link);
}

export function OrderConfirmed({ order, onClose }: { order: ConfirmedOrder; onClose: () => void }) {
  // Safari/iOS (no WebM transparency) and reduced motion get the still final frame instead.
  const [still, setStill] = useState(prefersStillArt);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    // Autoplay can be refused (battery saver, data saver); an empty sun block would look broken.
    video.play()?.catch(() => setStill(true));
  }, [still]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyRef = async () => {
    try {
      await navigator.clipboard.writeText(order.ref);
      setCopied(true);
    } catch {
      // Clipboard can be blocked in in-app browsers; the number stays on screen to read.
    }
  };

  const total = `৳${toBanglaDigits(order.total.toLocaleString("en-IN"))}`;
  const whatsapp = `https://wa.me/8801303103540?text=${encodeURIComponent(`Hello, my order number is ${order.ref}`)}`;

  return (
    <div className="skd" role="status" aria-live="polite">
      <div className="skd-sun">
        <div className="skd-kick">অর্ডার কনফার্ম</div>
        <span className="skd-big">ধন্যবাদ!</span>
        <div className="skd-pack" aria-hidden="true" data-still={still || undefined}>
          {still ? null : (
            <video
              ref={videoRef}
              src={ORDER_PACK_VIDEO}
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              onError={() => setStill(true)}
            />
          )}
          <img src={ORDER_PACK_STILL} alt="" width={600} height={600} />
        </div>
      </div>

      <div className="skd-body">
        <h3 className="skd-rise" style={{ "--d": "260ms" } as React.CSSProperties}>
          {order.firstName ? `${order.firstName}, ` : ""}আপনার অর্ডার পাঠানোর প্রস্তুতি চলছে
        </h3>
        <p className="skd-rise" style={{ "--d": "300ms" } as React.CSSProperties}>
          আমাদের টিম শীঘ্রই ফোন করে অর্ডারটি কনফার্ম করবে।
        </p>

        <button
          type="button"
          onClick={copyRef}
          className="skd-ticket sko-press skd-rise"
          style={{ "--d": "340ms" } as React.CSSProperties}
          data-copied={copied || undefined}
          aria-label={`অর্ডার নম্বর ${order.ref} কপি করুন`}
        >
          <span className="skd-ticket-l">
            <small>অর্ডার নম্বর</small>
            <b>#{order.ref}</b>
          </span>
          <span className="skd-ticket-r">
            <span className="skd-swap">
              <span><Copy aria-hidden="true" />কপি</span>
              <span><Check aria-hidden="true" />কপি হয়েছে</span>
            </span>
          </span>
        </button>

        <div className="skd-facts skd-rise" style={{ "--d": "380ms" } as React.CSSProperties}>
          <div className="skd-fact">
            <Phone aria-hidden="true" />
            <b>ফোন পাবেন</b>
            <small>কয়েক ঘণ্টার মধ্যে</small>
          </div>
          <div className="skd-fact">
            <Truck aria-hidden="true" />
            <b>১–৩ দিনে</b>
            <small>ডেলিভারি</small>
          </div>
          <div className="skd-fact">
            <Banknote aria-hidden="true" />
            <b>{total}</b>
            <small>হাতে পেয়ে ক্যাশে</small>
          </div>
        </div>

        <div className="skd-acts skd-rise" style={{ "--d": "420ms" } as React.CSSProperties}>
          <button type="button" onClick={onClose} className="skd-more sko-press">
            আরও কিছু দেখুন
          </button>
          <div className="skd-row">
            <a href="tel:+8801310980289" className="skd-call sko-press">
              <Phone aria-hidden="true" />
              ফোন করুন
            </a>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="skd-wa sko-press">
              <img src="https://cdn.reicon.dev/logos/whatsapp/original.svg" alt="" width={16} height={16} />
              হোয়াটসঅ্যাপ
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
