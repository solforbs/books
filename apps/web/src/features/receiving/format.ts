import { formatShillings, type Cents } from "@books/shared";

/** A date in the person's language ("12 Nov 2026"); anything unreadable is shown as it came. */
export function formatDate(value: string, language: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return date.toLocaleDateString(language, { dateStyle: "medium" });
  } catch {
    return date.toLocaleDateString();
  }
}

/** Whole shillings when there are no cents, otherwise two decimals. */
export function shillings(cents: number): string {
  return formatShillings(cents as Cents, { decimals: false });
}
