import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { useAccess } from "@/features/access/hooks/use-access";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { BulkForm } from "../components/bulk-form";
import { useProductFormData } from "../hooks/use-product-form-data";

/** Create several versions of one model at once (F01 §5.2). */
export function BulkProductsPage() {
  const { t } = useTranslation();
  const { can } = useAccess();
  const form = useProductFormData();

  if (form.ready && !can("add_products")) return <Navigate to="/products" replace />;
  if (form.error) return <LoadError error={form.error} onRetry={form.retry} />;
  if (!form.ready) return <LoadingText />;
  return (
    <SettingsPage
      title={t("catalog.bulk.title")}
      intro={t("catalog.bulk.intro")}
      backTo="/products"
    >
      <BulkForm categories={form.categories} data={form.data} />
    </SettingsPage>
  );
}
