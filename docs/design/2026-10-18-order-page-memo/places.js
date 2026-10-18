// জেলা / থানা search dropdowns, styled like Memo's other fields.
import { DISTRICTS, THANAS } from "./locations.js";
import { bn, escapeHtml, icon } from "./shared.js";

export const district = (id) => DISTRICTS.find((row) => row[0] === id);
export const thana = (id) => THANAS.find((row) => row[0] === id);

const ALIASES = { Chattogram: "chittagong ctg", Comilla: "cumilla", Bogura: "bogra", Jashore: "jessore", Barisal: "barishal", Coxsbazar: "coxs bazar cox's bazar", Chapainawabganj: "nawabganj", Netrokona: "netrakona", Jhalakathi: "jhalokati", Moulvibazar: "maulvibazar" };
const POPULAR = ["Dhaka", "Chattogram", "Rajshahi", "Gazipur", "Narayanganj", "Khulna", "Sylhet", "Bogura"];
const fold = (value) => value.normalize("NFC").toLowerCase().replace(/[\s'’.-]/g, "");
function rank(rows, query, bnIndex, enIndex) {
  const q = fold(query);
  if (!q) return rows;
  const scored = [];
  for (const row of rows) {
    const keys = [fold(row[bnIndex]), fold(row[enIndex]), ...(ALIASES[row[enIndex]] ?? "").split(" ").filter(Boolean).map(fold)];
    const score = keys.some((key) => key.startsWith(q)) ? 0 : keys.some((key) => key.includes(q)) ? 1 : -1;
    if (score >= 0) scored.push([score, row]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, row]) => row);
}
// Busy districts win ties ("raj" → রাজশাহী before রাজবাড়ী).
const busy = (row) => { const index = POPULAR.indexOf(row[2]); return index < 0 ? 99 : index; };
export const searchDistricts = (query = "") => rank([...DISTRICTS].sort((a, b) => (query ? busy(a) - busy(b) : 0) || a[1].localeCompare(b[1], "bn")), query, 1, 2);
/** City thanas first (that is how city customers think of their address), then upazilas. */
export const thanasOf = (districtId, query = "") => rank(THANAS.filter((row) => row[1] === districtId).sort((a, b) => b[4] - a[4] || a[2].localeCompare(b[2], "bn")), query, 2, 3);

export function deliveryWindow(state) {
  if (!state.district) return null;
  const [from, to] = district(state.district)[2] === "Dhaka" ? [1, 2] : [2, 3];
  const day = (offset) => { const date = new Date(); date.setDate(date.getDate() + offset); return date; };
  const fmt = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long" });
  const [a, b] = [day(from), day(to)];
  return a.getMonth() === b.getMonth() ? `${bn(a.getDate())}–${fmt.format(b)}` : `${fmt.format(a)} – ${fmt.format(b)}`;
}

const option = (kind, row, state, index, bnIndex, enIndex) => `<li role="option" id="opt-${kind}-${row[0]}" data-pick="${kind}:${row[0]}" aria-selected="${state[kind] === row[0]}" ${state.cb?.active === index ? "data-active" : ""}>${row[bnIndex]}<small>${row[enIndex]}</small></li>`;

/** Options for the open dropdown; also used to patch the list while the customer types. */
export function options(state, kind) {
  const query = state.cb?.field === kind ? state.cb.query : "";
  if (kind === "district") {
    const rows = searchDistricts(query);
    state.cbRows = rows.map((row) => row[0]);
    return rows.length ? rows.map((row, index) => option("district", row, state, index, 1, 2)).join("") : `<li class="combo-none">“${escapeHtml(query)}” নামে কোনো জেলা পাইনি</li>`;
  }
  if (!state.district) return "";
  const rows = thanasOf(state.district, query);
  state.cbRows = rows.map((row) => row[0]);
  if (!rows.length) return `<li class="combo-none">“${escapeHtml(query)}” নামে কোনো থানা পাইনি</li>`;
  const grouped = !query && rows.some((row) => row[4]);
  return rows.map((row, index) => `${grouped && (index === 0 || rows[index - 1][4] !== row[4]) ? `<li class="combo-group" role="presentation">${row[4] ? "সিটি থানা" : "উপজেলা"}</li>` : ""}${option("thana", row, state, index, 2, 3)}`).join("");
}

export function placeField(state, kind) {
  const open = state.cb?.field === kind;
  const selected = kind === "district" ? state.district && district(state.district)[1] : state.thana && thana(state.thana)[2];
  const disabled = kind === "thana" && !state.district;
  const [label, english] = kind === "district" ? ["জেলা", "District"] : ["থানা / উপজেলা", "Thana"];
  const placeholder = kind === "district" ? "জেলা খুঁজুন" : "থানা খুঁজুন";
  const error = state.errors[kind];
  return `<div class="field combo" data-cb="${kind}" ${open ? "data-open" : ""}><label for="field-${kind}">${label}<small>${english}</small></label><div class="combo-box"><input id="field-${kind}" data-combo="${kind}" data-field="${kind}" role="combobox" aria-expanded="${open}" aria-controls="list-${kind}" aria-autocomplete="list" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${placeholder}" value="${escapeHtml(selected || "")}" ${disabled ? "disabled" : ""} aria-invalid="${Boolean(error)}" ${error ? `aria-describedby="error-${kind}"` : ""}>${icon("search", 17)}</div><ul class="combo-list" role="listbox" id="list-${kind}" aria-label="${label}"></ul>${error ? `<span class="field-error" id="error-${kind}" role="alert">${error}</span>` : ""}</div>`;
}
