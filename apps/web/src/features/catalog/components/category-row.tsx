import type { Category } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { isApiError } from "@/lib/api";
import { useUpdateCategory } from "../hooks/use-categories";
import { CategoryForm } from "./category-form";

/** One category: edit it, hide it (refused with a clear reason while products use it), or show it again. */
export function CategoryRow({ category }: { category: Category }) {
  const { t } = useTranslation();
  const update = useUpdateCategory();
  const [editing, setEditing] = useState(false);
  const inUse = isApiError(update.error) && update.error.code === "category_in_use";

  if (editing) {
    return (
      <li className="p-4">
        <CategoryForm category={category} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {category.name}
            {category.hidden && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
                {t("catalog.status.hidden")}
              </span>
            )}
          </p>
          <p className="text-sm text-slate-700">
            {t(`catalog.tracking.${category.defaultTracking}`)} ·{" "}
            {t(`catalog.naming.${category.namingMode}`)} ·{" "}
            {t("catalog.categories.productCount", { count: category.productCount })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t("common.edit")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={update.isPending}
            onClick={() => update.mutate({ id: category.id, body: { hidden: !category.hidden } })}
          >
            {t(category.hidden ? "catalog.categories.unhide" : "catalog.categories.hide")}
          </Button>
        </div>
      </div>
      {inUse ? (
        <Alert variant="error">
          {t("catalog.categories.inUse", { count: category.productCount })}
        </Alert>
      ) : (
        <FormError error={update.error} />
      )}
    </li>
  );
}
