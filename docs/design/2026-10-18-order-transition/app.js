// Product page → অর্ডার করুন → Memo checkout, with three transition styles behind the picker.
// Design preview only: nothing is sent anywhere.
import { initialState, confirmation } from "./shared.js";
import { renderMemo } from "./variants/memo.js";
import { productPage } from "./product.js";
import { district, thana, options } from "./places.js";

const TRANSITIONS = ["push", "lift", "morph"];
const root = document.documentElement;
const stage = document.getElementById("stage");
const picker = document.querySelector(".proto-picker");
const highlight = picker.querySelector(".proto-picker-highlight");
const items = [...picker.querySelectorAll(".proto-picker-item:not(.proto-picker-replay)")];
const replay = picker.querySelector(".proto-picker-replay");
let current = 0;
let state = initialState();
let productScroll = 0;
let running = null;

function draw(focusField) {
  const disclosures = [...stage.querySelectorAll("details")].map((element) => element.open);
  stage.innerHTML = state.view === "product" ? productPage(state) : state.view === "done" ? confirmation(state, "memo") : renderMemo(state);
  stage.querySelectorAll("details").forEach((element, index) => {
    if (disclosures[index] !== undefined) element.open = disclosures[index];
  });
  if (focusField) {
    const element = stage.querySelector(`[data-field="${focusField}"]`);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center" });
  }
}

// ---------- Moving between the pages ----------
// The swap itself is synchronous; the View Transition only animates snapshots of before/after,
// so the checkout is on screen (and typeable) the moment the animation ends — nothing is fetched.
function navigate(view, direction, animate = true) {
  const update = () => {
    if (state.view === "product") productScroll = scrollY;
    state.view = view;
    state.cb = null;
    draw();
    scrollTo(0, view === "product" ? productScroll : 0);
  };
  running?.skipTransition();
  if (!animate || !document.startViewTransition) { update(); return; }
  root.dataset.nav = direction;
  const transition = document.startViewTransition(update);
  running = transition;
  transition.finished.finally(() => {
    if (running !== transition) return;
    running = null;
    delete root.dataset.nav;
  });
}

function openOrder() {
  history.pushState({ view: "order" }, "", "#order");
  navigate("order", "forward");
}

function goBack() {
  if (history.state?.view === "order") history.back(); // popstate animates it
  else navigate("product", "back");
}

window.addEventListener("popstate", (event) => {
  const view = location.hash === "#order" ? "order" : "product";
  if (view === state.view) return;
  // iOS Safari's edge-swipe already animated the page; don't play a second animation on top.
  navigate(view, view === "order" ? "forward" : "back", !event.hasUAVisualTransition);
});

// ---------- Form ----------
const toLatinDigits = (value) => value.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
function validate() {
  const errors = {};
  if (state.name.trim().length < 2) errors.name = "আপনার পুরো নাম লিখুন।";
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(toLatinDigits(state.phone).replace(/[\s-]/g, ""))) errors.phone = "সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখুন।";
  if (!state.district) errors.district = "জেলা বেছে নিন।";
  if (!state.thana) errors.thana = state.district ? "থানা বেছে নিন।" : "আগে জেলা বেছে নিন।";
  if (state.address.trim().length < 4) errors.address = "বাড়ি, রাস্তা বা এলাকার নাম লিখুন।";
  state.errors = errors;
  return Object.keys(errors);
}

// ---------- জেলা / থানা dropdowns ----------
const selectedLabel = (kind) => (kind === "district" ? state.district && district(state.district)[1] : state.thana && thana(state.thana)[2]) || "";
function paint(kind) {
  const box = stage.querySelector(`[data-cb="${kind}"]`);
  if (!box) return;
  const open = state.cb?.field === kind;
  box.toggleAttribute("data-open", open);
  box.querySelector("input").setAttribute("aria-expanded", String(open));
  if (open) box.querySelector(".combo-list").innerHTML = options(state, kind);
  syncActive(kind);
}
function syncActive(kind) {
  const box = stage.querySelector(`[data-cb="${kind}"]`);
  const input = box.querySelector("input");
  const rows = [...box.querySelectorAll('li[role="option"]')];
  rows.forEach((li, index) => li.toggleAttribute("data-active", index === state.cb?.active));
  const active = state.cb?.field === kind && rows[state.cb.active];
  if (active) { input.setAttribute("aria-activedescendant", active.id); active.scrollIntoView({ block: "nearest" }); }
  else input.removeAttribute("aria-activedescendant");
}
function openList(kind) {
  state.cb = { field: kind, query: "", active: 0 };
  paint(kind);
  const index = state.cbRows?.indexOf(state[kind]) ?? -1;
  if (index > 0) { state.cb.active = index; syncActive(kind); }
}
function closeList(kind) {
  if (state.cb?.field !== kind) return;
  state.cb = null;
  const input = stage.querySelector(`#field-${kind}`);
  if (input) input.value = selectedLabel(kind);
  paint(kind);
}
function pick(kind, id) {
  state.cb = null;
  document.activeElement?.blur();
  if (kind === "district") {
    if (state.district !== id) state.thana = null;
    state.district = id;
    delete state.errors.district;
    delete state.errors.thana;
    draw();
    stage.querySelector("#field-thana")?.focus();
  } else {
    state.thana = id;
    delete state.errors.thana;
    draw();
    stage.querySelector("#field-address")?.focus();
  }
}

stage.addEventListener("focusin", (event) => { const kind = event.target.dataset?.combo; if (kind && state.cb?.field !== kind) { openList(kind); event.target.select(); } });
stage.addEventListener("focusout", (event) => { const kind = event.target.dataset?.combo; if (kind) closeList(kind); });
// Keep focus in the search box while an option is tapped.
stage.addEventListener("mousedown", (event) => { if (event.target.closest(".combo-list")) event.preventDefault(); });
stage.addEventListener("keydown", (event) => {
  const kind = event.target.dataset?.combo;
  if (!kind) return;
  if (!state.cb) { if (event.key === "ArrowDown") { event.preventDefault(); openList(kind); } return; }
  const total = state.cbRows?.length ?? 0;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (total) { state.cb.active = (state.cb.active + (event.key === "ArrowDown" ? 1 : -1) + total) % total; syncActive(kind); }
  } else if (event.key === "Enter") { event.preventDefault(); if (total) pick(kind, state.cbRows[state.cb.active]); }
  else if (event.key === "Escape") { event.preventDefault(); closeList(kind); }
});

stage.addEventListener("input", (event) => {
  const target = event.target;
  const kind = target.dataset.combo;
  if (kind) {
    if (state.cb?.field !== kind) openList(kind);
    state.cb.query = target.value;
    state.cb.active = 0;
    paint(kind);
    target.closest(".combo").querySelector(".combo-list").scrollTop = 0;
    return;
  }
  const field = target.dataset.field;
  if (field && ["name", "phone", "address"].includes(field)) {
    state[field] = target.value;
    if (state.errors[field]) {
      delete state.errors[field];
      target.setAttribute("aria-invalid", "false");
      target.removeAttribute("aria-describedby");
      document.getElementById(`error-${field}`)?.remove();
    }
  }
});

stage.addEventListener("click", (event) => {
  const option = event.target.closest("li[data-pick]");
  if (option) { const [kind, id] = option.dataset.pick.split(":"); pick(kind, id); return; }
  const back = event.target.closest("[data-back]");
  if (back) { event.preventDefault(); goBack(); return; }
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.hasAttribute("data-order")) openOrder();
  else if (button.hasAttribute("data-size")) { state.size = Number(button.dataset.size); draw(); }
  else if (button.hasAttribute("data-qty")) { state.qty = Math.min(9, Math.max(1, state.qty + Number(button.dataset.qty))); draw(); }
  else if (button.hasAttribute("data-restart")) mount();
});

stage.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-checkout-form]")) return;
  event.preventDefault();
  state.cb = null;
  const errors = validate();
  if (errors.length) { draw(errors[0]); return; }
  state.view = "done";
  history.replaceState({ view: "done" }, "", "#done");
  draw();
  window.scrollTo(0, 0);
  document.querySelector(".demo-confirmation h1")?.setAttribute("tabindex", "-1");
  document.querySelector(".demo-confirmation h1")?.focus({ preventScroll: true });
});

// ---------- Picker (verbatim contract from PICKER.md) ----------
function moveHighlight() {
  const el = items[current];
  highlight.style.width = el.offsetWidth + "px";
  highlight.style.transform = `translateX(${el.offsetLeft}px)`;
}

// Every variant starts on the product page, so replay means "tap অর্ডার করুন again".
function mount() {
  running?.skipTransition();
  state = initialState();
  productScroll = 0;
  const url = new URL(location);
  url.hash = "";
  history.replaceState(null, "", url);
  stage.innerHTML = "";
  requestAnimationFrame(() => { draw(); scrollTo(0, 0); });
}

function setActive(i) {
  if (i < 0 || i >= TRANSITIONS.length) return;
  current = i;
  root.dataset.vt = TRANSITIONS[i];
  items.forEach((el, j) => {
    el.toggleAttribute("data-active", j === i);
    if (j === i) el.setAttribute("aria-current", "true");
    else el.removeAttribute("aria-current");
  });
  moveHighlight();
  const url = new URL(location);
  url.searchParams.set("v", i + 1);
  history.replaceState(null, "", url);
  mount();
}

items.forEach((el, i) => el.addEventListener("click", () => setActive(i)));
replay?.addEventListener("click", () => mount());
window.addEventListener("resize", moveHighlight);

document.addEventListener("keydown", (e) => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= TRANSITIONS.length) setActive(num - 1);
  else if (e.key === "ArrowRight") setActive((current + 1) % TRANSITIONS.length);
  else if (e.key === "ArrowLeft") setActive((current - 1 + TRANSITIONS.length) % TRANSITIONS.length);
  else if (e.key === "r" || e.key === "R") mount();
});

setActive((parseInt(new URLSearchParams(location.search).get("v"), 10) || 1) - 1);
requestAnimationFrame(() => requestAnimationFrame(() => picker.setAttribute("data-ready", "")));
