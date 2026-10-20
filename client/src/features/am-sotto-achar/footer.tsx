import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { RingingPhoneIcon } from "@/components/dock-contact";
import brandLogo from "@assets/sera-khabar-logo.webp";
import { WhatsAppBrandIcon } from "@/features/landing/campaign-layout";
import { AMSOTTO_CREDIT_HREF, AMSOTTO_PHONE_HREF, AMSOTTO_WHATSAPP_HREF } from "./content";

export function AmsottoFooter() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) ref.current?.classList.add("is-in");
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.2 });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return <footer className="fv fvq"><div ref={ref} className="fvq-in" data-fv data-visible={visible}>
    <img className="fvq-logo" src={brandLogo} alt="সেরা খাবার" width={700} height={128} loading="lazy" />
    <p className="fvq-tag">প্রকৃতির স্বাদ, যত্নের সঙ্গে পৌঁছে দিই আপনার ঘরে।</p>
    <div className="fvq-links"><a href={AMSOTTO_PHONE_HREF}><span className="fvq-ring"><RingingPhoneIcon still={Boolean(reduce) || !visible} /></span>কল করুন</a><span aria-hidden="true" /><a href={AMSOTTO_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"><span className="fvq-whatsapp"><WhatsAppBrandIcon /></span>হোয়াটসঅ্যাপ</a></div>
    <p className="fvq-trust"><b>ক্যাশ অন ডেলিভারি</b> · সারা বাংলাদেশে</p>
    <a className="fv-sign" href={AMSOTTO_CREDIT_HREF} target="_blank" rel="noopener noreferrer"><small>Designed &amp; Engineered by</small><span aria-hidden="true" /><img src="/arc-credit.webp" alt="Arc Labs Corporation" width={188} height={72} loading="lazy" decoding="async" /></a>
    <p className="fv-copy">© <span className="num">২০২৬</span> সেরা খাবার · নওহাটা, পবা, রাজশাহী, বাংলাদেশ, <span className="num">৬২১৩</span></p>
    <nav className="fv-pol" aria-label="নীতিমালা">{[["Privacy Policy", "/privacy-policy"], ["Refund & Return", "/refund-return-exchange"], ["Terms & Conditions", "/terms-and-conditions"]].map(([label, href]) => <a key={href} href={`https://www.serakhabar.com${href}`}>• {label}</a>)}</nav>
  </div></footer>;
}
