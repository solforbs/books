/**
 * IMEI validation: 15 digits with a valid Luhn check digit (F04 §4.3).
 * Spaces and dashes are removed before checking.
 */
export function normalizeImei(input: string): string {
  return input.replace(/[\s-]/g, "");
}

export function isValidImei(input: string): boolean {
  const imei = normalizeImei(input);
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = Number(imei[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
