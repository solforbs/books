import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { FormField } from "@/components/form-field";
import { MoreSection } from "@/components/more-section";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { SupplierFormValues } from "../supplier-form-values";
import { PaymentRuleFields } from "./payment-rule-fields";

export interface FieldsApi {
  values: SupplierFormValues;
  set: <K extends keyof SupplierFormValues>(key: K, value: SupplierFormValues[K]) => void;
  /** Already-translated message for a field, if it has one. */
  error: (field: string) => string | undefined;
}

/** Name, phone and payment rule up front; the rare details sit behind "More" (G2). */
export function SupplierFields({ values, set, error }: FieldsApi) {
  const { t } = useTranslation();
  return (
    <>
      <FormField label={t("suppliers.form.name")} error={error("name")}>
        {(a11y) => (
          <Input
            {...a11y}
            autoComplete="off"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
          />
        )}
      </FormField>
      <FormField
        label={t("suppliers.form.phone")}
        hint={t("suppliers.form.phoneHint")}
        error={error("phone")}
      >
        {(a11y) => (
          <Input
            {...a11y}
            type="tel"
            autoComplete="off"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        )}
      </FormField>
      <PaymentRuleFields values={values} set={set} error={error("period")} />
      <MoreSection>
        <ChoiceGroup
          legend={t("suppliers.form.currency")}
          choices={[
            { value: "KES", label: "KES" },
            { value: "USD", label: "USD" },
          ]}
          value={values.currency}
          onChange={(currency) => set("currency", currency)}
        />
        <Switch
          label={t("suppliers.form.neighbour")}
          description={t("suppliers.form.neighbourHint")}
          checked={values.isNeighbour}
          onChange={(checked) => set("isNeighbour", checked)}
        />
        <FormField
          label={t("suppliers.form.kraPin")}
          hint={t("suppliers.form.kraPinHint")}
          error={error("kraPin")}
        >
          {(a11y) => (
            <Input
              {...a11y}
              autoComplete="off"
              value={values.kraPin}
              onChange={(e) => set("kraPin", e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("suppliers.form.market")} hint={t("suppliers.form.marketHint")}>
          {(a11y) => (
            <Input
              {...a11y}
              value={values.market}
              onChange={(e) => set("market", e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("suppliers.form.notes")}>
          {(a11y) => (
            <Input {...a11y} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
          )}
        </FormField>
      </MoreSection>
    </>
  );
}
