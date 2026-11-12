import { PAYMENT_RULE_TYPES, TIME_UNITS } from "@books/shared";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { needsPeriod, type SupplierFormValues } from "../supplier-form-values";

interface Props {
  values: SupplierFormValues;
  set: <K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) => void;
  /** Already-translated message about the number, if any. */
  error: string | undefined;
}

/** The five payment rules as a simple choice; a number and days/weeks/months where needed. */
export function PaymentRuleFields({ values, set, error }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <ChoiceGroup
        legend={t("suppliers.form.rule")}
        choices={PAYMENT_RULE_TYPES.map((type) => ({
          value: type,
          label: t(`suppliers.rule.choice.${type}`),
        }))}
        value={values.ruleType}
        onChange={(type) => set("ruleType", type)}
      />
      {needsPeriod(values.ruleType) && (
        <div className="flex flex-wrap items-start gap-3">
          <div className="w-28">
            <FormField label={t("suppliers.form.periodNumber")} error={error}>
              {(a11y) => (
                <Input
                  {...a11y}
                  inputMode="numeric"
                  value={values.periodValue}
                  onChange={(e) => set("periodValue", e.target.value)}
                />
              )}
            </FormField>
          </div>
          <FormField label={t("suppliers.form.periodUnit")}>
            {(a11y) => (
              <Select
                {...a11y}
                value={values.periodUnit}
                onChange={(e) => set("periodUnit", e.target.value as typeof values.periodUnit)}
              >
                {TIME_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {t(`suppliers.unitName.${unit}`)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      )}
    </div>
  );
}
