import type { PaymentRule } from "@books/shared";
import type { SupplierRow } from "../infrastructure/tables/suppliers.table";

type RuleColumns = Pick<SupplierRow, "paymentType" | "paymentPeriodValue" | "paymentPeriodUnit">;

/** The payment rule of the contract as the three typed columns that store it. */
export function ruleToColumns(rule: PaymentRule): RuleColumns {
  if (rule.type === "within_time" || rule.type === "after_sold_with_latest_date") {
    return {
      paymentType: rule.type,
      paymentPeriodValue: rule.period.value,
      paymentPeriodUnit: rule.period.unit,
    };
  }
  return { paymentType: rule.type, paymentPeriodValue: null, paymentPeriodUnit: null };
}

export function ruleOf(row: RuleColumns): PaymentRule {
  const type = row.paymentType;
  if (type === "within_time" || type === "after_sold_with_latest_date") {
    return { type, period: { value: row.paymentPeriodValue!, unit: row.paymentPeriodUnit! } };
  }
  return { type };
}
