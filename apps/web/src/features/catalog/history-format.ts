import type { TFunction } from "i18next";
import { showMoney } from "./money-input";

const PRICE_FIELDS = new Set(["retailPrice", "wholesalePrice", "minPrice"]);

export const isPriceField = (field: string | null): boolean =>
  field !== null && PRICE_FIELDS.has(field);

/** A history value as text: prices in shillings, empty as a dash, anything else as it is. */
export function historyValueText(field: string | null, value: unknown, t: TFunction): string {
  if (value === null || value === undefined || value === "")
    return t("catalog.history.empty_value");
  if (isPriceField(field) && typeof value === "number") {
    return t("catalog.price", { amount: showMoney(value) });
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}
