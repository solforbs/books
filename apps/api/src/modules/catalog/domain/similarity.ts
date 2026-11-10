import { normalizeForCompare } from "@books/shared";

/**
 * "Is this the same thing typed differently?" (F01 §9). Pure token comparison: no database
 * extension, no fuzzy-matching library. It only ever produces a WARNING; the person decides.
 *
 * Two ways to be similar, depending on how the product is named:
 * - "parts" products (phones, laptops): same brand, same storage/colour/condition, and a
 *   model that is the same once filler words are dropped ("A15" vs "Galaxy A15"). Siblings
 *   of one model (other colour or storage) are legitimate variants and never warn.
 * - everything else (typed names): the names share most of their words after unifying
 *   spellings of the same thing ("Type-C" / "USB C", "1 m" / "1m"). A differing word that
 *   contains a digit ("20W" vs "33W", "1m" vs "2m") means a different specification.
 */

export interface SimilarityCandidate {
  id: string;
  name: string;
  /** How the product's category names its products. */
  namingMode: "parts" | "free";
  brand: string | null;
  model: string | null;
  storage: string | null;
  colour: string | null;
  condition: string | null;
}

const MODEL_FILLERS = new Set(["galaxy", "phone", "smartphone", "mobile", "tablet", "series"]);
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

/** Model without filler words and without the brand, spaces removed: "Galaxy A15" -> "a15". */
export function compactModel(brand: string | null, model: string | null): string {
  const brandWords = new Set(normalizeForCompare(brand ?? "").split(" "));
  return normalizeForCompare(model ?? "")
    .split(" ")
    .filter((w) => w && !MODEL_FILLERS.has(w) && !brandWords.has(w))
    .join("");
}

const same = (a: string | null, b: string | null) =>
  normalizeForCompare(a ?? "").replace(/\s/g, "") ===
  normalizeForCompare(b ?? "").replace(/\s/g, "");

function partsSimilar(a: SimilarityCandidate, b: SimilarityCandidate): boolean {
  if (!same(a.brand, b.brand)) return false;
  if (same(a.model, b.model)) return false; // the same model: a variant, not a lookalike
  const left = compactModel(a.brand, a.model);
  if (!left || left !== compactModel(b.brand, b.model)) return false;
  return same(a.storage, b.storage) && same(a.colour, b.colour) && same(a.condition, b.condition);
}

export function isSimilar(a: SimilarityCandidate, b: SimilarityCandidate): boolean {
  if (a.id === b.id) return false;
  if (a.namingMode === "parts" && b.namingMode === "parts") return partsSimilar(a, b);
  return areNamesSimilar(a.name, b.name);
}
