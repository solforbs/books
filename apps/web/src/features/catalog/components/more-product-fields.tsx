import type { Category } from "@books/shared";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { MoreSection } from "@/components/more-section";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { effectiveTracking } from "../product-request";
import type { FormApi, FormContextData } from "./form-api";
import { MoneyField } from "./money-field";
import { PackFields } from "./pack-fields";

interface MoreProductFieldsProps {
  form: FormApi;
  data: FormContextData;
  category: Category | undefined;
  /** Packs are added and retired on the product page after it exists. */
  hidePacks?: boolean;
}

/** Rare options, folded away behind "More" (G2). */
export function MoreProductFields({ form, data, category, hidePacks }: MoreProductFieldsProps) {
  const { t } = useTranslation();
  const { values, set, error } = form;
  const packsAllowed = !hidePacks && effectiveTracking(values, category) === "quantity";
  const perLocation = data.canSetPrices && data.locations.length > 1;

  const changeLocation = (locationId: string, patch: { retail?: string; wholesale?: string }) => {
    const rest = values.locationPrices.filter((l) => l.locationId !== locationId);
    const current = values.locationPrices.find((l) => l.locationId === locationId);
    set("locationPrices", [
      ...rest,
      { locationId, retail: "", wholesale: "", ...current, ...patch },
    ]);
  };

  return (
    <MoreSection>
      {category?.namingMode === "free" && (
        <FormField label={t("catalog.form.brandOptional")}>
          {(a11y) => (
            <Input {...a11y} value={values.brand} onChange={(e) => set("brand", e.target.value)} />
          )}
        </FormField>
      )}
      {data.canSetPrices && (
        <MoneyField
          label={t("catalog.form.minPrice")}
          hint={t("catalog.form.minPriceHint")}
          value={values.minPrice}
          onChange={(v) => set("minPrice", v)}
          error={error("minPrice")}
        />
      )}
      {perLocation && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-base font-semibold text-slate-900">
            {t("catalog.form.locationPrices")}
          </legend>
          <p className="text-sm text-slate-700">{t("catalog.form.locationPricesHint")}</p>
          {data.locations.map((location) => {
            const row = values.locationPrices.find((l) => l.locationId === location.id);
            return (
              <div key={location.id} className="grid gap-3 sm:grid-cols-2">
                <MoneyField
                  label={t("catalog.form.locationRetail", { name: location.name })}
                  value={row?.retail ?? ""}
                  onChange={(v) => changeLocation(location.id, { retail: v })}
                  error={error("locationPrices")}
                />
                <MoneyField
                  label={t("catalog.form.locationWholesale", { name: location.name })}
                  value={row?.wholesale ?? ""}
                  onChange={(v) => changeLocation(location.id, { wholesale: v })}
                />
              </div>
            );
          })}
        </fieldset>
      )}
      {packsAllowed && <PackFields form={form} data={data} />}
      <FormField label={t("catalog.form.warranty")} error={error("warrantyMonths")}>
        {(a11y) => (
          <Input
            {...a11y}
            inputMode="numeric"
            value={values.warrantyMonths}
            onChange={(e) => set("warrantyMonths", e.target.value)}
          />
        )}
      </FormField>
      <Switch
        label={t("catalog.form.canBeGivenFree")}
        description={t("catalog.form.canBeGivenFreeHint")}
        checked={values.canBeGivenFree}
        onChange={(v) => set("canBeGivenFree", v)}
      />
    </MoreSection>
  );
}
