import { toBanglaDigits } from "./bangla-digits";

const BANGLA_TO_LATIN: Record<string, string> = Object.fromEntries(
  "০১২৩৪৫৬৭৮৯".split("").map((digit, index) => [digit, String(index)]),
);

// Pack labels come from the catalog as "১ কেজি", "৫০০ গ্রাম", "1.5 kg" or "250g".
export function parsePackGrams(title: string): number | null {
  const latin = title.replace(/[০-৯]/g, (digit) => BANGLA_TO_LATIN[digit]);
  const match = latin.match(/(\d+(?:\.\d+)?)\s*(কেজি|kg|গ্রাম|g)/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return /কেজি|kg/i.test(match[2]) ? value * 1000 : value;
}

// Per-kg price for each pack, and how much a bigger pack saves compared with buying the
// smallest pack enough times. A saving is shown only when the numbers really give one.
export function getSizeOffers(bundles: readonly { title: string; amount: number }[]) {
  const grams = bundles.map((bundle) => parsePackGrams(bundle.title));
  const smallest = bundles
    .map((bundle, index) => ({ grams: grams[index], amount: bundle.amount }))
    .filter((pack): pack is { grams: number; amount: number } => pack.grams !== null && pack.amount > 0)
    .sort((a, b) => a.grams - b.grams)[0];
  return bundles.map((bundle, index) => {
    const packGrams = grams[index];
    if (!packGrams || bundle.amount <= 0) return { perKg: null, saving: 0 };
    const perKg = Math.round((bundle.amount / packGrams) * 1000);
    const saving = smallest && packGrams > smallest.grams
      ? Math.round((smallest.amount / smallest.grams) * packGrams - bundle.amount)
      : 0;
    return { perKg, saving: saving > 0 ? saving : 0 };
  });
}

export const formatTaka = (amount: number) => `৳${toBanglaDigits(amount.toLocaleString("en-IN"))}`;
