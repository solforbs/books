import { randomInt } from "node:crypto";

export const RECOVERY_CODE_COUNT = 10;

// Crockford-style alphabet: no 0/O or 1/I/L, so codes read back from paper are unambiguous.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUPS = 4;
const GROUP_LENGTH = 4;

/** One code looks like `7KQ2-MX9D-RT4P-W8HC` (~79 bits of randomness). */
export function generateRecoveryCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let group = "";
    for (let i = 0; i < GROUP_LENGTH; i++) group += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(group);
  }
  return groups.join("-");
}

export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateRecoveryCode());
  return [...codes];
}

/** Users may type codes in lower case, with spaces, or without dashes. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
