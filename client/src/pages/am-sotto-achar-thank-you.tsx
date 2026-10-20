import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, Phone } from "lucide-react";
import { Link, useLocation } from "wouter";
import headerLogo from "@assets/sera-khabar-leaf-logo.webp";
import { OrderConfirmed } from "@/components/order-confirmed";
import { amsottoSessionStorage, readAmsottoConfirmation, clearAmsottoConfirmation } from "@/features/am-sotto-achar/confirmation";
import { markAmsottoPurchaseTracked } from "@/features/am-sotto-achar/tracking";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent } from "@/lib/google-analytics";
import { AMSOTTO_PATH, AMSOTTO_PHONE_HREF, AMSOTTO_PHONE_LABEL, AMSOTTO_WHATSAPP_HREF } from "@/features/am-sotto-achar/content";
import "@/checkout-page.css";

export default function AmSottoAcharThankYouPage() {
  const [, setLocation] = useLocation();
  const [confirmation] = useState(() => readAmsottoConfirmation());
  useEffect(() => {
    document.getElementById("skx-title")?.focus({ preventScroll: true });
    if (!confirmation) return;
    const storage = amsottoSessionStorage();
    clearAmsottoConfirmation(storage);
    if (!markAmsottoPurchaseTracked(storage, confirmation.orderRef)) return;
    trackGoogleEcommerceEvent("purchase", {
      pageType: "thank_you", transactionId: confirmation.orderRef, value: confirmation.total,
      affiliation: "", tax: 0, shipping: confirmation.deliveryCharge, coupon: "",
      customer: { name: confirmation.customerName, phone: confirmation.phone, address: confirmation.address },
      items: [toGoogleAnalyticsItem({ id: confirmation.productId ?? confirmation.productName, name: confirmation.productName, variant: confirmation.variantLabel, price: confirmation.unitPrice, quantity: confirmation.quantity })],
    });
  }, [confirmation]);
  return <div className="skx">
    <header className="skx-header"><div className="skx-header-in"><Link href={AMSOTTO_PATH} className="skx-back"><ArrowLeft aria-hidden="true" /><span>ফিরে যান</span></Link><Link href={AMSOTTO_PATH} className="skx-brand" aria-label="সেরা খাবার — আমসত্ত্ব আচার"><img src={headerLogo} alt="" width={86} height={58} /></Link><span className="skx-assure"><Banknote aria-hidden="true" /><span>পণ্য হাতে পেয়ে পেমেন্ট</span></span></div></header>
    <main className="skx-main">
      {confirmation ? <div className="skx-done"><h1 id="skx-title" tabIndex={-1} className="sr-only">অর্ডার কনফার্ম</h1><OrderConfirmed order={{ ref: confirmation.orderRef, firstName: confirmation.customerName.split(/\s+/)[0] ?? "", total: confirmation.total }} onClose={() => setLocation(AMSOTTO_PATH)} /></div> : <div className="skx-done skx-hold"><h1 id="skx-title" tabIndex={-1}>অর্ডারের তথ্য পাওয়া যায়নি</h1><p>এই ডিভাইসে কোনো সাম্প্রতিক অর্ডার পাইনি। অর্ডার নিয়ে জানতে ফোন বা হোয়াটসঅ্যাপ করুন।</p><a href={AMSOTTO_PHONE_HREF}><Phone aria-hidden="true" className="inline size-4" /> {AMSOTTO_PHONE_LABEL}</a><p><a href={AMSOTTO_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">হোয়াটসঅ্যাপ করুন</a></p><Link href={AMSOTTO_PATH} className="skx-secondary">আমসত্ত্ব আচার পেজে ফিরে যান</Link></div>}
    </main>
  </div>;
}
