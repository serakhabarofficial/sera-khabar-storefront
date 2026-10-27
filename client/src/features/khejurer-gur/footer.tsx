import { ArrowUpRight } from "lucide-react";
import brandLogo from "@assets/sera-khabar-logo.webp";
import { WhatsAppBrandIcon } from "@/features/landing/campaign-layout";
import { AL, FOOTER_CELL_BLOOM, FOOTER_LOTUS, FOOTER_ROW } from "./alpona";
import { GUR_CREDIT_HREF, GUR_PHONE_HREF, GUR_PHONE_LABEL, GUR_WHATSAPP_HREF } from "./content";

const html = (markup: string) => ({ dangerouslySetInnerHTML: { __html: markup } });
const EDGE = AL.border("currentColor", 1200);
const bloom = <span className="sg-al" aria-hidden="true"><svg viewBox="-100 -100 200 200" {...html(FOOTER_CELL_BLOOM)} /></span>;

// দুই রঙ footer: a terracotta crown with the logo and a turning lotus, then a cream sheet for
// everything readable — Swiss-grid call cells, links, credit and copyright.
export function GurFooter() {
  return <footer className="ftw"><div className="ft ft1" data-io>
    <div className="ft-edge" aria-hidden="true" {...html(EDGE)} />
    <div className="ft1-in">
      <div className="ft-mand" aria-hidden="true"><svg viewBox="-100 -100 200 200" {...html(FOOTER_LOTUS)} /></div>
      <img className="ft-logo" src={brandLogo} alt="সেরা খাবার" width={700} height={128} loading="lazy" />
      <p className="ft-tag">প্রকৃতির স্বাদ, যত্নের সঙ্গে পৌঁছে দিই আপনার ঘরে।</p>
      <div className="ft-panel">
        <div className="sg">
          <a className="sg-cell" href={GUR_PHONE_HREF}><span className="sg-idx num">০১</span><span className="sg-ico sg-phone"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="ring" d="M8 3c.5 0 2.5 4.5 2.5 5 0 1-1.5 2-2 3s.5 2 1.5 3c.39.39 2 2 3 1.5s2-2 3-2c.5 0 5 2 5 2.5 0 2-1.5 3.5-3 4-1.5.5-2.5.5-4.5 0s-3.5-1-6-3.5S4.5 13 4 11s-.5-3 0-4.5S6 3 8 3Z" /></svg><i /></span><b>কল করুন</b><small className="num">{GUR_PHONE_LABEL}</small><ArrowUpRight className="sg-arrow" aria-hidden="true" />{bloom}</a>
          <a className="sg-cell" href={GUR_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"><span className="sg-idx num">০২</span><span className="sg-ico sg-wa"><WhatsAppBrandIcon /><i /></span><b>হোয়াটসঅ্যাপ</b><small>মেসেজে অর্ডার</small><ArrowUpRight className="sg-arrow" aria-hidden="true" />{bloom}</a>
        </div>
        <svg className="ft-row" viewBox="0 0 300 22" aria-hidden="true" {...html(FOOTER_ROW)} />
        <p className="ft-trust"><b>ক্যাশ অন ডেলিভারি</b> · সারা বাংলাদেশে</p>
        <nav className="ft-pol" aria-label="নীতিমালা">{[["Privacy Policy", "/privacy-policy"], ["Refund & Return", "/refund-return-exchange"], ["Terms & Conditions", "/terms-and-conditions"]].map(([label, href]) => <a key={href} href={href}>{label}</a>)}</nav>
        <a className="ft-credit" href={GUR_CREDIT_HREF} target="_blank" rel="noopener noreferrer"><small>Designed &amp; Engineered by</small><i /><img src="/arc-credit.webp" alt="Arc Labs Corporation" width={188} height={72} loading="lazy" /></a>
        <p className="ft-copy">© <span className="num">২০২৬</span> সেরা খাবার · নওহাটা, পবা, রাজশাহী, বাংলাদেশ, <span className="num">৬২১৩</span></p>
      </div>
    </div>
  </div></footer>;
}
