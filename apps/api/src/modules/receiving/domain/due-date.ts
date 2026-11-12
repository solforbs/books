import type { PaymentRule, Period } from "@books/shared";

/** Kenya has no daylight saving: always UTC+3. */
const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** The calendar date (YYYY-MM-DD) in Kenya at this moment. */
export function kenyaDate(now: Date): string {
  return new Date(now.getTime() + KENYA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Adds days, weeks or calendar months to a YYYY-MM-DD date (a month end is clamped: 31 Jan + 1 month = 28/29 Feb). */
export function addPeriod(date: string, period: Period): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  if (period.unit === "months") {
    const monthIndex = m - 1 + period.value;
    const year = y + Math.floor(monthIndex / 12);
    const month = ((monthIndex % 12) + 12) % 12;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(d, lastDay))).toISOString().slice(0, 10);
  }
  const days = period.unit === "weeks" ? period.value * 7 : period.value;
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * When the owed amount of a delivery is due, for the rules that are date based (contract):
 * cash is due the day of delivery, "within a time" after that period. The other rules depend
 * on sales (F07) and give null.
 */
export function dueDateFor(rule: PaymentRule, now: Date): string | null {
  if (rule.type === "cash") return kenyaDate(now);
  if (rule.type === "within_time") return addPeriod(kenyaDate(now), rule.period);
  return null;
}
