import { STARTER_CONDITIONS, buildProductName, cleanText } from "@books/shared";
import type { Category, ProductOptionsResponse } from "@books/shared";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import type { FormApi } from "./form-api";
import { SuggestInput } from "./suggest-input";

function unique(values: string[]): string[] {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

/** Models suggested for the chosen brand (or all models until a brand is typed). */
function modelsFor(options: ProductOptionsResponse | undefined, brand: string): string[] {
  const wanted = cleanText(brand).toLowerCase();
  return unique(
    (options?.models ?? [])
      .filter((m) => !wanted || !m.brand || m.brand.toLowerCase() === wanted)
      .map((m) => m.model),
  );
}

export const storageSuggestions = (o?: ProductOptionsResponse) => unique(o?.storages ?? []);
export const colourSuggestions = (o?: ProductOptionsResponse) => unique(o?.colours ?? []);
export const conditionSuggestions = (o?: ProductOptionsResponse) =>
  unique([...STARTER_CONDITIONS, ...(o?.conditions ?? [])]);

interface NamingFieldsProps {
  form: FormApi;
  category: Category | undefined;
  options: ProductOptionsResponse | undefined;
}

/** "Built from parts" categories ask for brand, model, storage, colour, condition; others a name. */
export function NamingFields({ form, category, options }: NamingFieldsProps) {
  const { t } = useTranslation();
  const { values, set, error } = form;
  if (!category) return null;

  if (category.namingMode === "free") {
    return (
      <FormField label={t("catalog.form.name")} error={error("name")}>
        {(a11y) => (
          <Input {...a11y} value={values.name} onChange={(e) => set("name", e.target.value)} />
        )}
      </FormField>
    );
  }

  const preview = values.brand.trim() && values.model.trim() ? buildProductName(values) : "";
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("catalog.form.brand")} error={error("brand")}>
          {(a11y) => (
            <SuggestInput
              {...a11y}
              options={unique(options?.brands ?? [])}
              value={values.brand}
              onChange={(e) => set("brand", e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("catalog.form.model")} error={error("model")}>
          {(a11y) => (
            <SuggestInput
              {...a11y}
              options={modelsFor(options, values.brand)}
              value={values.model}
              onChange={(e) => set("model", e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("catalog.form.storage")} error={error("storage")}>
          {(a11y) => (
            <SuggestInput
              {...a11y}
              options={storageSuggestions(options)}
              value={values.storage}
              onChange={(e) => set("storage", e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("catalog.form.colour")} error={error("colour")}>
          {(a11y) => (
            <SuggestInput
              {...a11y}
              options={colourSuggestions(options)}
              value={values.colour}
              onChange={(e) => set("colour", e.target.value)}
            />
          )}
        </FormField>
        <FormField label={t("catalog.form.condition")} error={error("condition")}>
          {(a11y) => (
            <SuggestInput
              {...a11y}
              options={conditionSuggestions(options)}
              value={values.condition}
              onChange={(e) => set("condition", e.target.value)}
            />
          )}
        </FormField>
      </div>
      {preview && (
        <p
          data-testid="name-preview"
          aria-live="polite"
          className="rounded-lg bg-brand-light px-4 py-3 text-lg font-semibold text-brand-dark"
        >
          {t("catalog.form.namePreview", { name: preview })}
        </p>
      )}
    </div>
  );
}
