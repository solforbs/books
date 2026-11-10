import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { CategoryForm } from "../components/category-form";
import { CategoryRow } from "../components/category-row";
import { useCategories } from "../hooks/use-categories";

const listClass = "divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white";

/** Settings -> Product categories: the shop's own list, no ready-made one (F01 §4). */
export function CategoriesPage() {
  const { t } = useTranslation();
  const { data, error, refetch } = useCategories();
  const [adding, setAdding] = useState(false);

  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <LoadingText />;

  return (
    <SettingsPage
      title={t("settings.categories.title")}
      intro={t("catalog.categories.intro")}
      action={
        !adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden className="h-5 w-5" />
            {t("catalog.categories.add")}
          </Button>
        )
      }
    >
      {adding && (
        <Card className="sm:p-5">
          <h2 className="mb-3 font-heading text-xl font-bold">
            {t("catalog.categories.addTitle")}
          </h2>
          <CategoryForm onDone={() => setAdding(false)} />
        </Card>
      )}
      {data.length === 0 && !adding ? (
        <p className="text-slate-700">{t("catalog.categories.empty")}</p>
      ) : (
        <ul className={listClass} aria-label={t("settings.categories.title")}>
          {data.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}
    </SettingsPage>
  );
}
