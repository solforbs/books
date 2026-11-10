import { formatShillings, parseShillings, type Cents } from "@books/shared";

export type MoneyParse = { ok: true; value: number | null } | { ok: false };

/** Shillings typed by a person -> cents. Blank means "no price"; negatives are refused. */
export function parseMoneyInput(text: string): MoneyParse {
  if (text.trim() === "") return { ok: true, value: null };
  try {
    const value = parseShillings(text);
    return value < 0 ? { ok: false } : { ok: true, value };
  } catch {
    return { ok: false };
  }
}

/** Cents -> what goes back into a price input (no thousands separator, so it re-parses). */
export function moneyToInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return formatShillings(value as Cents, { decimals: false }).replace(/,/g, "");
}

/** Cents -> text shown to people, with thousands separators. */
export function showMoney(value: number): string {
  return formatShillings(value as Cents, { decimals: false });
}
