import { randomInt } from "node:crypto";
import { checkPassword } from "@books/shared";

// No look-alike characters (0/O, 1/l/I), so it can be read out or copied from a screen.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "-#@!";
const GROUP_LENGTH = 4;

const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]!;

/**
 * A strong temporary password, e.g. `Hb5kQ7m-Xq2r-9TbZ` (~80 bits). It passes the
 * shared password policy (with the person's own words), and is shown once to
 * whoever created the account; the person must change it at first login.
 */
export function generateTemporaryPassword(personalWords: string[] = []): string {
  for (;;) {
    const all = LOWER + UPPER + DIGITS;
    const groups = Array.from({ length: 3 }, () =>
      Array.from({ length: GROUP_LENGTH }, () => pick(all)).join(""),
    );
    // Guarantee every character kind, whatever the random draw gave.
    const candidate = `${pick(UPPER)}${pick(LOWER)}${pick(DIGITS)}${groups.join(pick(SYMBOLS))}`;
    if (checkPassword(candidate, personalWords).length === 0) return candidate;
  }
}
