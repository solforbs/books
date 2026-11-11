import { isValidImei, normalizeBarcode, normalizeForCompare } from "@books/shared";

/**
 * What real product and shop labels carry (founders, 2026-11-11): EAN-8/13, UPC-A/E and
 * ITF-14 are 6-14 digits; Code 39 / Code 128 shop labels mix letters, digits and `- . /`
 * and Code 39 holds at most 43 characters.
 */
const BARCODE_SHAPE = /^[0-9A-Za-z./-]{3,43}$/;

export type BarcodeCheck = { ok: true; value: string } | { ok: false; reason: string };

/** Letters, digits and `- . /`, 3-43 long; a 15-digit IMEI is not a product barcode (F01 §7). */
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
