// জেলা / থানা search for checkout (approved 2026-10-18, docs/design/2026-10-18-order-page-memo).
import { DISTRICTS, THANAS } from "./bd-locations-data.ts";

export type District = (typeof DISTRICTS)[number];
export type Thana = (typeof THANAS)[number];

export const findDistrict = (id: string | null) => (id ? DISTRICTS.find((row) => row[0] === id) : undefined);
export const findThana = (id: string | null) => (id ? THANAS.find((row) => row[0] === id) : undefined);

const ALIASES: Record<string, string> = {
  Chattogram: "chittagong ctg",
  Comilla: "cumilla",
  Bogura: "bogra",
  Jashore: "jessore",
  Barisal: "barishal",
  Coxsbazar: "coxs bazar cox's bazar",
  Chapainawabganj: "nawabganj",
  Netrokona: "netrakona",
  Jhalakathi: "jhalokati",
  Moulvibazar: "maulvibazar",
  // Upazilas: former names and the spellings used in the news.
  Shantiganj: "southsunamganj dakshinsunamganj দক্ষিণসুনামগঞ্জ",
  Zianagar: "indurkani ইন্দুরকানী",
  Shayestaganj: "shaistaganj sayestaganj",
  Mokamtala: "mokamtola",
  Chandraganj: "chandrogonj",
  Ruhia: "ruhea",
  Bhulli: "bhully",
};
const POPULAR = ["Dhaka", "Chattogram", "Rajshahi", "Gazipur", "Narayanganj", "Khulna", "Sylhet", "Bogura"];
const fold = (value: string) => value.normalize("NFC").toLowerCase().replace(/[\s'’.-]/g, "");

/** Bangla, English and common old spellings all match; names that start with the query come first. */
function rank<Row extends readonly unknown[]>(rows: Row[], query: string, bnIndex: number, enIndex: number): Row[] {
  const q = fold(query);
  if (!q) return rows;
  const scored: Array<[number, Row]> = [];
  for (const row of rows) {
    const english = String(row[enIndex]);
    const keys = [fold(String(row[bnIndex])), fold(english), ...(ALIASES[english] ?? "").split(" ").filter(Boolean).map(fold)];
    const score = keys.some((key) => key.startsWith(q)) ? 0 : keys.some((key) => key.includes(q)) ? 1 : -1;
    if (score >= 0) scored.push([score, row]);
  }
  return scored.sort((a, b) => a[0] - b[0]).map(([, row]) => row);
}

// Busy districts win ties ("raj" → রাজশাহী before রাজবাড়ী).
const busy = (row: District) => {
  const index = POPULAR.indexOf(row[2]);
  return index < 0 ? 99 : index;
};

export function searchDistricts(query = ""): District[] {
  const sorted = [...DISTRICTS].sort((a, b) => (query ? busy(a) - busy(b) : 0) || a[1].localeCompare(b[1], "bn"));
  return rank(sorted, query, 1, 2);
}

/** City thanas first (that is how city customers think of their address), then upazilas. */
export function thanasOf(districtId: string | null, query = ""): Thana[] {
  if (!districtId) return [];
  const rows = THANAS.filter((row) => row[1] === districtId).sort((a, b) => b[4] - a[4] || a[2].localeCompare(b[2], "bn"));
  return rank(rows, query, 2, 3);
}

const bn = (value: number) => new Intl.NumberFormat("bn-BD").format(value);

/** "২০–২১ অক্টোবর": Dhaka 1–2 days, everywhere else 2–3 days (the published delivery policy). */
export function deliveryWindow(districtId: string | null, today = new Date()) {
  const district = findDistrict(districtId);
  if (!district) return null;
  const [from, to] = district[2] === "Dhaka" ? [1, 2] : [2, 3];
  return formatDeliveryWindow(from, to, today);
}

/** "২২–২৪ অক্টোবর": the dates `from`–`to` days after today. */
export function formatDeliveryWindow(from: number, to: number, today = new Date()) {
  const day = (offset: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() + offset);
    return date;
  };
  const format = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long" });
  const [first, last] = [day(from), day(to)];
  return first.getMonth() === last.getMonth()
    ? `${bn(first.getDate())}–${format.format(last)}`
    : `${format.format(first)} – ${format.format(last)}`;
}

/** The courier reads one address line: street, then থানা, then জেলা (same order as the honey checkout). */
export function composeDeliveryAddress(street: string, thanaId: string | null, districtId: string | null) {
  return [street.trim(), findThana(thanaId)?.[2], findDistrict(districtId)?.[1]].filter(Boolean).join(", ");
}
