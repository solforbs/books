import type { PaymentRule, Supplier } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MoreSection } from "@/components/more-section";
import { PaymentRuleFields } from "@/features/suppliers/components/payment-rule-fields";
import {
  emptySupplierValues,
  needsPeriod,
  type SupplierFormValues,
} from "@/features/suppliers/supplier-form-values";

type Rule = PaymentRule | "invalid" | null;

function startValues(supplier: Supplier): SupplierFormValues {
  const rule = supplier.paymentRule;
  const period = "period" in rule ? rule.period : null;
  return {
    ...emptySupplierValues,
    ruleType: rule.type,
    periodValue: String(period?.value ?? 1),
    periodUnit: period?.unit ?? "months",
  };
}

function toRule(v: SupplierFormValues): Rule {
  if (!needsPeriod(v.ruleType)) return { type: v.ruleType } as PaymentRule;
  const value = Number(v.periodValue.trim());
  if (!Number.isInteger(value) || value < 1 || value > 3650) return "invalid";
  return { type: v.ruleType, period: { value, unit: v.periodUnit } } as PaymentRule;
}

/**
 * "Pay under a different rule, for this delivery only" (F04 section 9.6). Starts from the
 * supplier's own rule and never changes it; nothing is sent until the person edits a field.
 */
export function RuleOverride({
  supplier,
  onChange,
}: {
  supplier: Supplier;
  onChange: (rule: Rule) => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() => startValues(supplier));
  const rule = toRule(values);
  return (
    <MoreSection label={t("receiving.pay.ruleOnly")}>
      <p className="text-sm text-slate-700">{t("receiving.pay.ruleHint")}</p>
      <PaymentRuleFields
        values={values}
        set={(key, value) => {
          const next = { ...values, [key]: value };
          setValues(next);
          onChange(toRule(next));
        }}
        error={rule === "invalid" ? t("suppliers.form.invalidPeriod") : undefined}
      />
    </MoreSection>
  );
}
