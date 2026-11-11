import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PackRow } from "../product-form-values";
import type { FormApi, FormContextData } from "./form-api";
import { MoneyField } from "./money-field";

/** Pack units (box, carton) for quantity-only goods. Each phone or laptop is scanned alone. */
export function PackFields({ form, data }: { form: FormApi; data: FormContextData }) {
  const { t } = useTranslation();
  const { values, set, error } = form;
  const change = (index: number, patch: Partial<PackRow>) =>
    set(
      "packs",
      values.packs.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-semibold text-slate-900">{t("catalog.packs.title")}</legend>
      <p className="text-sm text-slate-700">{t("catalog.packs.hint")}</p>
      {values.packs.map((pack, index) => (
        <div key={index} className="rounded-lg border border-slate-300 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("catalog.packs.name")}>
              {(a11y) => (
                <Input
                  {...a11y}
                  placeholder={t("catalog.packs.nameHint")}
                  value={pack.name}
                  onChange={(e) => change(index, { name: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t("catalog.packs.size")}>
              {(a11y) => (
                <Input
                  {...a11y}
                  inputMode="numeric"
                  value={pack.size}
                  onChange={(e) => change(index, { size: e.target.value })}
                />
              )}
            </FormField>
            {data.canSetPrices && (
              <>
                <MoneyField
                  label={t("catalog.packs.wholesale")}
                  value={pack.wholesale}
                  onChange={(v) => change(index, { wholesale: v })}
                />
                <MoneyField
                  label={t("catalog.packs.retail")}
                  value={pack.retail}
                  onChange={(v) => change(index, { retail: v })}
                />
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              set(
                "packs",
                values.packs.filter((_, i) => i !== index),
              )
            }
          >
            <X aria-hidden className="h-4 w-4" />
            {t("catalog.packs.remove")}
          </Button>
        </div>
      ))}
      {error("packUnits") && (
        <p className="text-sm font-semibold text-red-800">{error("packUnits")}</p>
      )}
      {values.packs.length < 5 && (
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() =>
            set("packs", [...values.packs, { name: "", size: "", wholesale: "", retail: "" }])
          }
        >
          <Plus aria-hidden className="h-5 w-5" />
          {t("catalog.packs.add")}
        </Button>
      )}
    </fieldset>
  );
}
