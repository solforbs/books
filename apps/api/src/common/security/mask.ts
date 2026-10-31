/**
 * Masks identifiers before they are written to logs or the audit trail
 * (house rule 10: never store full phone numbers in logs).
 *   +254712345678    -> +254712***678
 *   jane@example.com -> j***@example.com
 */
export function maskIdentifier(identifier: string): string {
  const at = identifier.indexOf("@");
  if (at > 0) return `${identifier[0]}***${identifier.slice(at)}`;
  if (identifier.length <= 6) return "***";
  return `${identifier.slice(0, 7)}***${identifier.slice(-3)}`;
}
