import { normalizeForCompare } from "./product-name";

/**
 * Is this the same name typed differently? (F01 §9; suppliers reuse it, F03 §3.) Pure token
 * comparison, it only ever produces a WARNING. A differing word that contains a digit
 * ("20W" vs "33W", "1m" vs "2m") means a different thing.
 */
const NAME_SIMILARITY_THRESHOLD = 0.6;

/** Unified comparison words of a typed name. */
export function nameTokens(name: string): string[] {
  const unified = normalizeForCompare(name)
    .replace(/\busb (?=type ?c\b)/g, "") // "usb type c" -> "type c"
    .replace(/\b(?:usb|type) ?c\b/g, "typec") // Type-C, USB C, USB-C, usbc -> typec
    .replace(/(\d) (?=(?:m|cm|mm|mb|gb|tb|w|mah|v|a|ml|l|kg|g)\b)/g, "$1"); // "1 m" -> "1m"
  return [...new Set(unified.split(" ").filter(Boolean))];
}

export function areNamesSimilar(a: string, b: string): boolean {
  const left = new Set(nameTokens(a));
  const right = new Set(nameTokens(b));
  if (left.size === 0 || right.size === 0) return false;
  const shared = [...left].filter((t) => right.has(t));
  const union = new Set([...left, ...right]);
  const different = [...union].filter((t) => !(left.has(t) && right.has(t)));
  if (different.some((t) => /\d/.test(t))) return false;
  return shared.length / union.size >= NAME_SIMILARITY_THRESHOLD;
}
