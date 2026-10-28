import { bn } from "./content";

const MONTHS = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
const DHAKA_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * Today's date in Bangladesh's revised বঙ্গাব্দ calendar (2019): the year starts on 14 April,
 * বৈশাখ–আশ্বিন have 31 days, the rest 30, and ফাল্গুন 29 (30 when that February is a leap year).
 * The day turns over at midnight in Dhaka.
 */
export function banglaDateParts(now: Date = new Date()) {
  const [y, m, d] = DHAKA_DAY.format(now).split("-").map(Number);
  const startYear = m > 4 || (m === 4 && d >= 14) ? y : y - 1;
  let day = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(startYear, 3, 14)) / 86_400_000);
  const lengths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, isLeap(startYear + 1) ? 30 : 29, 30];
  let month = 0;
  while (day >= lengths[month]) day -= lengths[month++];
  return { day: bn(day + 1), month: MONTHS[month], year: bn(startYear - 593) };
}

/** The same date as one line, e.g. "১২ কার্তিক ১৪৩৩". */
export function banglaDate(now: Date = new Date()) {
  const { day, month, year } = banglaDateParts(now);
  return `${day} ${month} ${year}`;
}
