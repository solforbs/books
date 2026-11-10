import {
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
  type Category,
} from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { useCreateCategory, useUpdateCategory } from "../hooks/use-categories";
import { namingChoices, trackingChoices } from "./choices";

interface CategoryFormProps {
  /** Edit this category; without it the form adds a new one. */
  category?: Category;
  /** Starting naming mode for a new category (the bulk screen only works with "parts"). */
  defaultNaming?: Category["namingMode"];
  onDone: (saved?: Category) => void;
}

/** Name, how new products are tracked by default, and how product names are made. */
export function CategoryForm({ category, defaultNaming = "free", onDone }: CategoryFormProps) {
  const { t } = useTranslation();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const mutation = category ? update : create;
  const [name, setName] = useState(category?.name ?? "");
  const [tracking, setTracking] = useState(category?.defaultTracking ?? "quantity");
  const [naming, setNaming] = useState(category?.namingMode ?? defaultNaming);
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const values = { name, defaultTracking: tracking, namingMode: naming };
    if (category) {
      const parsed = updateCategoryRequestSchema.safeParse(values);
      if (!parsed.success) return showIssues(parsed.error.issues);
      clear();
      update.mutate(
        { id: category.id, body: parsed.data },
        { onSuccess: ({ category: saved }) => onDone(saved) },
      );
      return;
    }
    const parsed = createCategoryRequestSchema.safeParse(values);
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    create.mutate(parsed.data, { onSuccess: ({ category: saved }) => onDone(saved) });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <FormField label={t("catalog.categories.name")} error={fieldError("name")}>
        {(a11y) => (
          <Input
            {...a11y}
            value={name}
            placeholder={t("catalog.categories.nameHint")}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </FormField>
      <ChoiceGroup
        legend={t("catalog.categories.defaultTracking")}
        value={tracking}
        onChange={setTracking}
        choices={trackingChoices(t)}
      />
      <ChoiceGroup
        legend={t("catalog.categories.naming")}
        value={naming}
        onChange={setNaming}
        choices={namingChoices(t)}
      />
      <FormError error={mutation.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("common.working") : t("common.save")}
        </Button>
        <Button variant="secondary" onClick={() => onDone()} disabled={mutation.isPending}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
