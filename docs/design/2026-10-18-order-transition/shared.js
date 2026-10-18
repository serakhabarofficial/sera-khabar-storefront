// Design fixtures only. Nothing in this directory calls a commerce API or places an order.
const IMG = "https://xnuiaxygeoydtopvcmli.supabase.co/storage/v1/object/public/product-images/690aa8b3-6657-46c4-8df5-addcc1f96035/c1eae1fc-d16a-4724-9080-5e86fb7e5701/2a02541f-49c2-407a-b491-dab0b39a7169";
// Mirrors the first-paint catalog entry for granulated-jaggery.
export const product = {
  name: "দানাদার গুড়",
  english: "Granulated Jaggery",
  tag: "খেজুরের রসের ঝরঝরে দানা",
  image: (width = 960) => `${IMG}/${width}.webp`,
  sizes: [{ label: "৫০০ গ্রাম", price: 300 }, { label: "১ কেজি", price: 560 }],
};

export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
export const bn = (value) => new Intl.NumberFormat("bn-BD").format(value);
export const money = (value) => `৳${bn(value)}`;
export const initialState = () => ({ view: "product", size: 0, qty: 1, name: "", phone: "", district: null, thana: null, address: "", errors: {}, cb: null });
export const subtotal = (state) => product.sizes[state.size].price * state.qty;
export const delivery = (state) => subtotal(state) >= 2600 ? 0 : 100;
export const total = (state) => subtotal(state) + delivery(state);
export const count = (state) => state.qty;

export function icon(name, size = 20) {
  const paths = {
    back: '<path d="m12 19-7-7 7-7M5 12h14"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    next: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    bag: '<path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7l-1.3 1.3a16 16 0 0 0 5.9 5.9l1.3-1.3a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.7 2Z"/>',
    truck: '<path d="M1 4h14v12H1zM15 8h4l3 4v4h-7"/><circle cx="5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    cash: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.check}</svg>`;
}

export function header() {
  return `<header class="site-header"><div class="site-header-inner"><a class="back-link" aria-label="পণ্যে ফিরে যান" href="#" data-back>${icon("back", 18)}<span>ফিরে যান</span></a><a class="brand" href="#" data-back aria-label="সেরা খাবার"><img src="/site/logo.webp" alt="সেরা খাবার" width="86" height="58"></a><span class="header-assurance" aria-label="পণ্য হাতে পেয়ে পেমেন্ট">${icon("cash", 19)}<span>পণ্য হাতে পেয়ে পেমেন্ট</span></span></div></header>`;
}

export function footer() {
  return `<footer class="checkout-footer"><p>একটু সাহায্য লাগবে?</p><a href="tel:+8801310980289">${icon("phone", 16)} 01310-980289</a><span class="footer-location">সেরা খাবার · নওহাটা, রাজশাহী</span><small class="preview-disclaimer">ডিজাইন প্রিভিউ · নমুনা কার্ট · কোনো আসল অর্ডার হবে না</small></footer>`;
}

export function field(state, name, label, english, placeholder, options = {}) {
  const error = state.errors[name];
  const attributes = `id="field-${name}" name="${name}" data-field="${name}" ${options.optional ? "" : "required"} autocomplete="${options.autocomplete ?? name}" aria-invalid="${Boolean(error)}" ${error ? `aria-describedby="error-${name}"` : options.hint ? `aria-describedby="hint-${name}"` : ""}`;
  const control = options.textarea
    ? `<textarea ${attributes} rows="${options.rows ?? 3}" placeholder="${placeholder}">${escapeHtml(state[name])}</textarea>`
    : `<input ${attributes} type="${name === "phone" ? "tel" : "text"}" ${name === "phone" ? 'inputmode="tel" maxlength="20"' : ""} placeholder="${placeholder}" value="${escapeHtml(state[name])}">`;
  return `<div class="field ${options.wide ? "field-wide" : ""}"><label for="field-${name}">${label}<small>${english}</small></label>${control}${options.hint && !error ? `<span class="field-hint" id="hint-${name}">${options.hint}</span>` : ""}${error ? `<span class="field-error" id="error-${name}" role="alert">${error}</span>` : ""}</div>`;
}

export function contactFields(state) {
  return `<div class="field-row">${field(state, "name", "আপনার নাম", "Full name", "যেমন: সিহাব আহমেদ", { autocomplete: "name" })}${field(state, "phone", "মোবাইল নম্বর", "Phone number", "01XXXXXXXXX", { autocomplete: "tel", hint: "এই নম্বরেই অর্ডার কনফার্ম করব।" })}</div>`;
}

export function addressField(state) {
  return field(state, "address", "সম্পূর্ণ ঠিকানা", "Delivery address", "বাড়ি / হোল্ডিং, রাস্তা, এলাকা", { textarea: true, autocomplete: "street-address" });
}

export function cartRows(state) {
  const size = product.sizes[state.size];
  return `<div class="cart-rows"><article class="cart-item"><img src="${product.image(320)}" alt="${product.name}" width="80" height="80"><div class="cart-item-copy"><h3>${product.name}</h3><p>${size.label}</p><div class="quantity" aria-label="${product.name} পরিমাণ"><button type="button" data-qty="-1" aria-label="${product.name} কমান" ${state.qty <= 1 ? "disabled" : ""}>−</button><span>${bn(state.qty)}</span><button type="button" data-qty="1" aria-label="${product.name} বাড়ান" ${state.qty >= 9 ? "disabled" : ""}>+</button></div></div><strong class="cart-item-price">${money(subtotal(state))}</strong></article></div>`;
}

export function amounts(state, showTotal = true) {
  return `<div class="amounts"><div><span>পণ্যের দাম</span><strong>${money(subtotal(state))}</strong></div><div><span>ডেলিভারি চার্জ</span><strong>${delivery(state) ? money(delivery(state)) : "ফ্রি"}</strong></div>${showTotal ? `<div class="grand-total"><span>সর্বমোট<small>হাতে পেয়ে পরিশোধ করবেন</small></span><strong data-total>${money(total(state))}</strong></div>` : ""}</div>`;
}

export function paymentNote(state, eta) {
  return `<div class="payment-note"><span class="payment-icon">${icon("cash", 24)}</span><div><strong>ক্যাশ অন ডেলিভারি</strong><p>পণ্য হাতে পেয়ে টাকা দেবেন। এখন কোনো পেমেন্ট নয়।</p></div><span class="selected-check">${icon("check", 14)}</span></div><div class="delivery-note">${icon("truck", 18)}<span>${eta ? `সম্ভাব্য ডেলিভারি <strong class="eta">${eta}</strong>` : "ঢাকায় ১–২ দিন · ঢাকার বাইরে ২–৩ দিন"}</span><b>${delivery(state) ? money(delivery(state)) : "ফ্রি"}</b></div>`;
}

export function policies() {
  return `<details class="policy-note"><summary>ডেলিভারি ও ফেরত নীতি ${icon("down", 14)}</summary><p>পেমেন্ট শুধু ক্যাশ অন ডেলিভারি। পণ্যে সমস্যা হলে ডেলিভারির ২৪ ঘণ্টার মধ্যে আমাদের জানান। এখানে দেখানো কার্ট ও চার্জ ডিজাইন প্রিভিউয়ের নমুনা।</p></details>`;
}

export function submitButton(state, label = "অর্ডার নিশ্চিত করুন") {
  return `<button class="primary-button" type="submit"><span>${label}</span><span class="button-end">${money(total(state))} ${icon("arrow", 20)}</span></button><p class="submit-help">কনফার্ম করতে আমরা আপনাকে ফোন করব।</p>`;
}


export function confirmation(state, variant) {
  return `<div class="checkout-page variant-${variant}">${header()}<main class="demo-confirmation"><span class="handwritten">এই তো, হয়ে গেল!</span><h1>যত্ন করে পৌঁছে দেব<br>আপনার দরজায়।</h1><div class="confirmation-art"><img src="/site/bag.webp" alt="সেরা খাবারের কাগজের ব্যাগ" width="300" height="300"><span class="confirmation-check">${icon("check", 25)}</span></div><p><strong>${escapeHtml(state.name)}</strong>, অর্ডার কনফার্ম হলে এভাবেই পরের ধাপ দেখাবে।</p><div class="demo-receipt"><span>নমুনা অর্ডার · PREVIEW</span><strong>${money(total(state))}</strong><small>এটি শুধু ডিজাইন প্রিভিউ। কোনো আসল অর্ডার পাঠানো হয়নি।</small></div><button type="button" class="secondary-button" data-restart>ফর্মে ফিরে যান ${icon("back", 17)}</button></main>${footer()}</div>`;
}
