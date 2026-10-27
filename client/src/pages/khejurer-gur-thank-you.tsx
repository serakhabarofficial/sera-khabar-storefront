import { useEffect, useState } from "react";
import { ArrowLeft, Banknote, Phone } from "lucide-react";
import { Link, useLocation } from "wouter";
import headerLogo from "@assets/sera-khabar-leaf-logo.webp";
import { OrderConfirmed } from "@/components/order-confirmed";
import { clearGurConfirmation, gurSessionStorage, markGurPurchaseTracked, readGurConfirmation } from "@/features/khejurer-gur/confirmation";
import { toGoogleAnalyticsItem, trackGoogleEcommerceEvent } from "@/lib/google-analytics";
import { GUR_PATH, GUR_PHONE_HREF, GUR_PHONE_LABEL, GUR_WHATSAPP_HREF } from "@/features/khejurer-gur/content";
import "@/checkout-page.css";

export default function KhejurerGurThankYouPage() {
  const [, setLocation] = useLocation();
  const [confirmation] = useState(() => readGurConfirmation());
  useEffect(() => {
    document.getElementById("skx-title")?.focus({ preventScroll: true });
    if (!confirmation) return;
    const storage = gurSessionStorage();
    clearGurConfirmation(storage);
    if (!markGurPurchaseTracked(storage, confirmation.orderRef)) return;
    trackGoogleEcommerceEvent("purchase", {
      pageType: "thank_you", transactionId: confirmation.orderRef, value: confirmation.total,
      affiliation: "", tax: 0, shipping: confirmation.deliveryCharge, coupon: "",
      customer: { name: confirmation.customerName, phone: confirmation.phone, address: confirmation.address },
      items: confirmation.items.map((line) => toGoogleAnalyticsItem({ id: line.productId, name: line.productName, variant: line.variantLabel, price: line.unitPrice, quantity: line.quantity })),
    });
  }, [confirmation]);
  return <div className="skx">
    <header className="skx-header"><div className="skx-header-in"><Link href={GUR_PATH} className="skx-back"><ArrowLeft aria-hidden="true" /><span>ফিরে যান</span></Link><Link href={GUR_PATH} className="skx-brand" aria-label="সেরা খাবার — খেজুরের গুড়"><img src={headerLogo} alt="" width={86} height={58} /></Link><span className="skx-assure"><Banknote aria-hidden="true" /><span>পণ্য হাতে পেয়ে পেমেন্ট</span></span></div></header>
    <main className="skx-main">
      {confirmation ? <div className="skx-done"><h1 id="skx-title" tabIndex={-1} className="sr-only">অর্ডার কনফার্ম</h1><OrderConfirmed order={{ ref: confirmation.orderRef, firstName: confirmation.customerName.split(/\s+/)[0] ?? "", total: confirmation.total }} onClose={() => setLocation(GUR_PATH)} /></div> : <div className="skx-done skx-hold"><h1 id="skx-title" tabIndex={-1}>অর্ডারের তথ্য পাওয়া যায়নি</h1><p>এই ডিভাইসে কোনো সাম্প্রতিক অর্ডার পাইনি। অর্ডার নিয়ে জানতে ফোন বা হোয়াটসঅ্যাপ করুন।</p><a href={GUR_PHONE_HREF}><Phone aria-hidden="true" className="inline size-4" /> {GUR_PHONE_LABEL}</a><p><a href={GUR_WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">হোয়াটসঅ্যাপ করুন</a></p><Link href={GUR_PATH} className="skx-secondary">খেজুরের গুড় পেজে ফিরে যান</Link></div>}
    </main>
  </div>;
}
