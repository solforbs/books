import type { Category } from "@books/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useAccess } from "@/features/access/hooks/use-access";
import { CategoryForm } from "./category-form";

interface CategoryPickerProps {
  categories: Category[];
  value: string;
  onChange: (category: Category) => void;
  /** Only categories that build names from parts (the "create several" screen). */
  partsOnly?: boolean;
  error?: string | undefined;
}

/** Category first: pick one, or add a new one right here without leaving the form. */
export function CategoryPicker({
  categories,
  value,
  onChange,
  partsOnly,
  error,
}: CategoryPickerProps) {
  const { t } = useTranslation();
  const { can } = useAccess();
  const [adding, setAdding] = useState(false);
  // The list refreshes after saving; until then the new category must still be pickable.
  const [added, setAdded] = useState<Category | null>(null);
  const known =
    added && !categories.some((c) => c.id === added.id) ? [...categories, added] : categories;
  const options = known.filter(
    (c) => (!c.hidden || c.id === value) && (!partsOnly || c.namingMode === "parts"),
  );

  return (
    <div className="flex flex-col gap-2">
      <FormField label={t("catalog.form.category")} error={error}>
        {(a11y) => (
          <Select
            {...a11y}
            className="w-full"
            value={value}
            onChange={(e) => {
              const picked = known.find((c) => c.id === e.target.value);
              if (picked) onChange(picked);
            }}
          >
            <option value="">{t("catalog.form.chooseCategory")}</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      {can("manage_products") && !adding && (
        <Button variant="ghost" className="w-fit" onClick={() => setAdding(true)}>
          <Plus aria-hidden className="h-5 w-5" />
          {t("catalog.form.addCategory")}
        </Button>
      )}
      {adding && (
        <div className="rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
          <h2 className="mb-3 font-heading text-lg font-bold">
            {t("catalog.categories.addTitle")}
          </h2>
          <CategoryForm
            defaultNaming={partsOnly ? "parts" : "free"}
            onDone={(saved) => {
              setAdding(false);
              if (saved) {
                setAdded(saved);
                onChange(saved);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
