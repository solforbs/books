import type { PaymentRule } from "@books/shared";
import type { TFunction } from "i18next";

function period(t: TFunction, rule: PaymentRule): string {
  if (!("period" in rule)) return "";
  return t(`suppliers.units.${rule.period.unit}`, { count: rule.period.value });
}

/** The rule in a few plain words, for lists ("Pay within 1 month"). */
export function ruleShort(t: TFunction, rule: PaymentRule): string {
  return t(`suppliers.rule.short.${rule.type}`, { period: period(t, rule) });
}

/** The rule as one friendly sentence, for the supplier page. */
export function ruleSentence(t: TFunction, rule: PaymentRule): string {
  return t(`suppliers.rule.sentence.${rule.type}`, { period: period(t, rule) });
}
