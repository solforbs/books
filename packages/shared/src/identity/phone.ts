/**
 * Kenyan phone numbers are stored in E.164 form (+2547XXXXXXXX / +2541XXXXXXXX),
 * so "0712 345 678", "712345678" and "+254 712 345 678" are the same person.
 * Returns null when the input is not a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  const match = /^(?:\+?254|0)?([17]\d{8})$/.exec(digits);
  return match ? `+254${match[1]}` : null;
}
