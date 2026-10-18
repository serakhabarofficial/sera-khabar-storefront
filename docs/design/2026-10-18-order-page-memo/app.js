// Memo with জেলা / থানা search dropdowns. Design preview only: nothing is sent anywhere.
import { initialState, confirmation } from "./shared.js";
import { renderMemo } from "./variants/memo.js";
import { district, thana, options } from "./places.js";

const stage = document.getElementById("stage");
let state = initialState();

function draw(focusField) {
  const disclosures = [...stage.querySelectorAll("details")].map((element) => element.open);
  stage.innerHTML = state.done ? confirmation(state, "memo") : renderMemo(state);
  stage.querySelectorAll("details").forEach((element, index) => {
    if (disclosures[index] !== undefined) element.open = disclosures[index];
  });
  if (focusField) {
    const element = stage.querySelector(`[data-field="${focusField}"]`);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: "center" });
  }
}

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
    stage.querySelector("#field-thana")?.focus(); // straight on to থানা
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
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.hasAttribute("data-quantity")) {
    const [product, delta] = button.dataset.quantity.split(":");
    state.quantities[product] = Math.min(9, Math.max(1, state.quantities[product] + Number(delta)));
    draw();
  } else if (button.hasAttribute("data-restart")) {
    state = initialState();
    draw();
    window.scrollTo(0, 0);
  }
});

stage.addEventListener("submit", (event) => {
  if (!event.target.matches("[data-checkout-form]")) return;
  event.preventDefault();
  state.cb = null;
  const errors = validate();
  if (errors.length) { draw(errors[0]); return; }
  state.done = true;
  draw();
  window.scrollTo(0, 0);
  document.querySelector(".demo-confirmation h1")?.setAttribute("tabindex", "-1");
  document.querySelector(".demo-confirmation h1")?.focus({ preventScroll: true });
});

draw();
