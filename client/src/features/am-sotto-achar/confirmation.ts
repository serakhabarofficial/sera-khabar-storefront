import { readLandingOrderConfirmation, writeLandingOrderConfirmation, clearLandingOrderConfirmation, type LandingOrderConfirmation } from "../landing/order";
import { AMSOTTO_CONFIRMATION_KEY } from "./content";

// A successful order must still show its receipt when privacy settings deny sessionStorage.
// Memory lives only for this SPA session; it is cleared on the thank-you page just like storage.
let memory: LandingOrderConfirmation | null = null;
type ConfirmationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function amsottoSessionStorage(): ConfirmationStorage | undefined {
  try { return window.sessionStorage; } catch { return undefined; }
}
export function saveAmsottoConfirmation(confirmation: LandingOrderConfirmation, storage = amsottoSessionStorage()) {
  memory = confirmation;
  writeLandingOrderConfirmation(storage, confirmation, AMSOTTO_CONFIRMATION_KEY);
}
export function readAmsottoConfirmation(storage = amsottoSessionStorage()) {
  return readLandingOrderConfirmation(storage, AMSOTTO_CONFIRMATION_KEY) ?? memory;
}
export function clearAmsottoConfirmation(storage = amsottoSessionStorage()) {
  memory = null;
  clearLandingOrderConfirmation(storage, AMSOTTO_CONFIRMATION_KEY);
}
