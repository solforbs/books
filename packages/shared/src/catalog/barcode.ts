/**
 * Barcodes (F01 §7). Shop-generated barcodes are EAN-13 in the "restricted circulation"
 * range (prefix 20-29), which GS1 reserves for in-store use. We use "20" + a 10-digit
 * per-business sequence + the EAN-13 check digit, so a code is unique inside one business.
 */

/** EAN-13 check digit for the first 12 digits. */
export function ean13CheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error("EAN-13 needs exactly 12 digits");
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);
}

/** Builds a shop barcode from a positive per-business sequence number. */
export function shopBarcodeFromSequence(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 9_999_999_999) {
    throw new Error("Barcode sequence out of range");
  }
  const first12 = `20${String(sequence).padStart(10, "0")}`;
  return `${first12}${ean13CheckDigit(first12)}`;
}

export function isShopBarcode(code: string): boolean {
  return isValidEan13(code) && code.startsWith("20");
}

/** What a scanner or keyboard may send: digits and letters only, no spaces. */
export function normalizeBarcode(input: string): string {
  return input.replace(/\s+/g, "").trim();
}
