import type { Category } from "@books/shared";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MoneyField } from "./money-field";

export interface Fixes {
  name: string;
  categoryId: string;
  retail: string;
}

interface ApproveFixFieldsProps {
  fixes: Fixes;
  onChange: (fixes: Fixes) => void;
  categories: Category[];
  canSetPrices: boolean;
}

/** The few things an approver may correct before approving: name, category and price. */
export function ApproveFixFields({
  fixes,
  onChange,
  categories,
  canSetPrices,
}: ApproveFixFieldsProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
      <FormField label={t("catalog.form.name")}>
        {(a11y) => (
          <Input
            {...a11y}
            value={fixes.name}
            onChange={(e) => onChange({ ...fixes, name: e.target.value })}
          />
        )}
      </FormField>
      <FormField label={t("catalog.form.category")}>
        {(a11y) => (
          <Select
            {...a11y}
            className="w-full"
            value={fixes.categoryId}
            onChange={(e) => onChange({ ...fixes, categoryId: e.target.value })}
          >
            {categories
              .filter((c) => !c.hidden || c.id === fixes.categoryId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        )}
      </FormField>
      {canSetPrices && (
        <MoneyField
          label={t("catalog.form.retailPrice")}
          value={fixes.retail}
          onChange={(v) => onChange({ ...fixes, retail: v })}
        />
      )}
    </div>
  );
}
