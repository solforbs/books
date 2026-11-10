import { VAT_TYPES } from "@books/shared";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Select } from "@/components/ui/select";
import type { FormApi, FormContextData } from "./form-api";
import { MoneyField } from "./money-field";

/**
 * Selling prices appear only for people who may set them; everyone else adds the product
 * without a price and an approver prices it. VAT shows only when the business charges VAT.
 */
export function PriceFields({ form, data }: { form: FormApi; data: FormContextData }) {
  const { t } = useTranslation();
  const { values, set, error } = form;
  return (
    <>
      {data.canSetPrices && (
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField
            label={t("catalog.form.retailPrice")}
            value={values.retail}
            onChange={(v) => set("retail", v)}
            error={error("retail")}
          />
          <MoneyField
            label={t("catalog.form.wholesalePrice")}
            value={values.wholesale}
            onChange={(v) => set("wholesale", v)}
            error={error("wholesale")}
          />
        </div>
      )}
      {data.vatEnabled && (
        <FormField label={t("catalog.form.vatType")}>
          {(a11y) => (
            <Select
              {...a11y}
              className="w-full"
              value={values.vatType || "standard"}
              onChange={(e) => set("vatType", e.target.value)}
            >
              {VAT_TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(`catalog.vat.${v}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      )}
    </>
  );
}
