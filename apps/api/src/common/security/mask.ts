import { normalizeKenyanPhone } from "@books/shared";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Masks identifiers before they are written to logs or the audit trail
 * (house rule 10: never store full phone numbers in logs).
 *   0712345678 / +254712345678 -> +254******678
 *   jane@example.com           -> j***@example.com
 *   anything else              -> ***   (a typo could still be someone's number)
 */
export function maskIdentifier(identifier: string): string {
  const value = identifier.trim();
  const phone = normalizeKenyanPhone(value);
  if (phone) return `+254******${phone.slice(-3)}`;
  if (EMAIL.test(value)) return `${value[0]}***${value.slice(value.indexOf("@"))}`;
  return "***";
}
