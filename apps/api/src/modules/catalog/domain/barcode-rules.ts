import { isValidImei, normalizeBarcode, normalizeForCompare } from "@books/shared";

const BARCODE_SHAPE = /^[0-9A-Za-z]{4,40}$/;

export type BarcodeCheck = { ok: true; value: string } | { ok: false; reason: string };

/** Digits and letters only, 4-40 long; a 15-digit IMEI is not a product barcode (F01 §7). */
export function checkBarcodeValue(raw: string): BarcodeCheck {
  const value = normalizeBarcode(raw);
  if (!BARCODE_SHAPE.test(value)) return { ok: false, reason: "invalid_characters_or_length" };
  if (/^\d{15}$/.test(value) && isValidImei(value)) return { ok: false, reason: "imei" };
  return { ok: true, value };
}

/** What the sharing rule needs to know about a product. */
export interface SharingSubject {
  conditionFamilyKey: string | null;
  condition: string | null;
}

/**
 * F01 §7: a manufacturer barcode may be shared ONLY by products that differ in condition
 * alone (same brand, model, storage and colour, but a different condition). Anything else,
 * including two products with no condition or no model, is a clash.
 */
export function canShareManufacturerBarcode(owner: SharingSubject, incoming: SharingSubject) {
  if (!owner.conditionFamilyKey || owner.conditionFamilyKey !== incoming.conditionFamilyKey) {
    return false;
  }
  const a = normalizeForCompare(owner.condition ?? "");
  const b = normalizeForCompare(incoming.condition ?? "");
  return a !== "" && b !== "" && a !== b;
}
