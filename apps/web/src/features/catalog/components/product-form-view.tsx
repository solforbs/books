import { normalizeBarcode, type Category } from "@books/shared";
import { useCallback, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import type { SaveBlock } from "../hooks/use-save-flow";
import type { ProductFormValues } from "../product-form-values";
import type { FormIssue } from "../product-request";
import { effectiveTracking } from "../product-request";
import { ChipInput } from "./chip-input";
import { CategoryPicker } from "./category-picker";
import { trackingChoices } from "./choices";
import type { FormApi, FormContextData } from "./form-api";
import { MoreProductFields } from "./more-product-fields";
import { NamingFields } from "./naming-fields";
import { PriceFields } from "./price-fields";
import { SaveBlockPanel } from "./save-block-panel";

export interface SaveState {
  block: SaveBlock | null;
  error: unknown;
  pending: boolean;
  createAnyway: () => void;
  dismiss: () => void;
}

interface ProductFormViewProps {
  mode: "create" | "edit";
  initial: ProductFormValues;
  categories: Category[];
  data: FormContextData;
  save: SaveState;
  /** Builds the request from the form and sends it; returns what is wrong, if anything. */
  onSubmit: (values: ProductFormValues, category: Category | undefined) => FormIssue[] | null;
  onCancel: () => void;
}

/** The add / edit form: category first, then the fields that category needs. */
export function ProductFormView({
  mode,
  initial,
  categories,
  data,
  save,
  onSubmit,
  onCancel,
}: ProductFormViewProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initial);
  const [category, setCategory] = useState(() =>
    categories.find((c) => c.id === initial.categoryId),
  );
  const { fieldError, showIssues, clear } = useFieldErrors();

  const set = useCallback<FormApi["set"]>(
    (key, value) => setValues((previous) => ({ ...previous, [key]: value })),
    [],
  );
  const form: FormApi = { values, set, error: fieldError };

  const pickCategory = (picked: Category) => {
    setCategory(picked);
    setValues((previous) => ({ ...previous, categoryId: picked.id, trackingType: null }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const issues = onSubmit(values, category);
    if (issues) showIssues(issues);
    else clear();
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <CategoryPicker
        categories={categories}
        value={values.categoryId}
        onChange={pickCategory}
        error={fieldError("categoryId")}
      />
      {category && (
        <>
          <NamingFields form={form} category={category} options={data.options} />
          <ChoiceGroup
            legend={t("catalog.form.tracking")}
            value={effectiveTracking(values, category)}
            onChange={(v) => set("trackingType", v)}
            choices={trackingChoices(t)}
          />
          <PriceFields form={form} data={data} />
          {mode === "create" && (
            <ChipInput
              label={t("catalog.form.barcodes")}
              hint={t("catalog.form.barcodesHint")}
              values={values.barcodes}
              onChange={(v) => set("barcodes", v)}
              suggestions={[]}
              normalize={normalizeBarcode}
            />
          )}
          <MoreProductFields
            form={form}
            data={data}
            category={category}
            hidePacks={mode === "edit"}
          />
        </>
      )}
      {save.block && (
        <SaveBlockPanel
          block={save.block}
          busy={save.pending}
          onCreateAnyway={save.createAnyway}
          onDismiss={save.dismiss}
        />
      )}
      <FormError error={save.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.pending || !category}>
          {save.pending
            ? t("common.working")
            : t(mode === "create" ? "catalog.form.create" : "common.save")}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={save.pending}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
