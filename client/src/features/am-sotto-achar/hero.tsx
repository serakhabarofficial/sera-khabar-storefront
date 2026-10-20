import { useEffect, useId, useRef, type CSSProperties, type MouseEventHandler } from "react";
import brandLogo from "@assets/sera-khabar-logo.webp";
import { WhatsAppBrandIcon } from "@/features/landing/campaign-layout";
import { AMSOTTO_HERO_IMAGE, AMSOTTO_TASTES, AMSOTTO_WHATSAPP_HREF, reducedMotion, taka } from "./content";

const stagger = (i: number) => ({ "--i": i } as CSSProperties);

export function AmsottoHero({ onOrderClick, price, packLabel }: {
  onOrderClick: MouseEventHandler<HTMLAnchorElement>; price?: number; packLabel?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const ringId = useId();
  useEffect(() => {
    const el = root.current!;
    let disposed = false;
    const fitRing = () => {
      if (disposed) return;
      const text = el.querySelector<SVGTextElement>(".v1-ring text")!;
      text.style.fontSize = "";
      const length = text.getComputedTextLength();
      if (length > 0) text.style.fontSize = `${parseFloat(getComputedStyle(text).fontSize) * (2 * Math.PI * 92) / length}px`;
    };
    fitRing();
    void document.fonts.ready.then(fitRing);
    document.fonts.addEventListener("loadingdone", fitRing);
    const words = Array.from(el.querySelectorAll<HTMLElement>(".v1-cycle-box span"));
    let active = 0;
    let timeout = 0;
    const cycle = reducedMotion() ? undefined : window.setInterval(() => {
      const prev = words[active];
      active = (active + 1) % words.length;
      prev.classList.remove("on");
      prev.classList.add("off");
      const next = words[active];
      next.classList.remove("off");
      next.style.transition = "none";
      next.getBoundingClientRect();
      next.style.transition = "";
      next.classList.add("on");
      timeout = window.setTimeout(() => prev.classList.remove("off"), 450);
    }, 2200);
    return () => {
      disposed = true;
      clearInterval(cycle);
      clearTimeout(timeout);
      document.fonts.removeEventListener("loadingdone", fitRing);
    };
  }, []);

  return <section ref={root} className="v1-hero hv hv-fade" data-hero>
    <div className="v1-hero-copy">
      <div style={stagger(0)}><img className="v1-hero-logo" src={brandLogo} alt="সেরা খাবার" width={700} height={128} fetchPriority="high" /></div>
      <h1 style={stagger(1)}>আমসত্ত্ব<br />আচার</h1>
      <p className="v1-cycle" style={stagger(2)}>একটা কামড়ে <span className="v1-cycle-box" aria-live="off">{AMSOTTO_TASTES.map((t, i) => <span key={t.name} data-w={i} className={i === 0 ? "on" : undefined}>{t.name}</span>)}</span></p>
      <p className="v1-lede" style={stagger(3)}>মিষ্টি, টক, হালকা ঝাল — খাঁটি বাঙালি আচার, এখন সরাসরি আপনার দরজায়।</p>
      <div className="v1-cta" style={stagger(4)}>
        <a className="v1-btn v1-btn-glow" href="#v1-order" onClick={onOrderClick}>এখনই অর্ডার করুন</a>
        <a className="v1-btn ghost" href={AMSOTTO_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"><WhatsAppBrandIcon className="size-[18px]" /> WhatsApp</a>
      </div>
      <p className="v1-trust" style={stagger(5)}><b>ক্যাশ অন ডেলিভারি</b> · সারা বাংলাদেশে ডেলিভারি <span className="num">৳১০০</span></p>
    </div>
    <div className="hv-art">
      <img className="hv-img" src={AMSOTTO_HERO_IMAGE} alt="গ্রামের পটভূমিতে বাটিভরা আমসত্ত্ব আচার" width={1100} height={1100} fetchPriority="high" />
      <div className="hv-orbit">
        <div className="hv-ring"><svg className="v1-ring" viewBox="0 0 200 200" aria-hidden="true"><defs><path id={ringId} d="M100,100 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" /></defs><text><textPath href={`#${ringId}`}>{"টক · ঝাল · মিষ্টি · ঘরে তৈরি · টক · ঝাল · মিষ্টি · রোদে শুকানো · টক · ঝাল · মিষ্টি · খাঁটি সরিষার তেল ·\u00a0"}</textPath></text></svg></div>
        <div className="v1-chip c1"><i>১</i><span>টক<small>আমসত্ত্ব</small></span></div>
        <div className="v1-chip c2"><i>২</i><span>ঝাল<small>সরিষা ও মরিচ</small></span></div>
        <div className="v1-chip c3"><i>৩</i><span>মিষ্টি<small>গুড়ের আভাস</small></span></div>
        {price !== undefined && <div className="v1-sticker"><small>{packLabel}</small><b className="num">{taka(price)}</b></div>}
      </div>
    </div>
  </section>;
}
