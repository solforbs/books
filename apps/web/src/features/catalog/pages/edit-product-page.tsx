import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { useAccess } from "@/features/access/hooks/use-access";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { EditProductForm } from "../components/edit-product-form";
import { useProductFormData } from "../hooks/use-product-form-data";
import { useProduct } from "../hooks/use-products";

/** Edit a product (permission manage_products). */
export function EditProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { can } = useAccess();
  const form = useProductFormData();
  const product = useProduct(id);

  if (!can("manage_products")) return <Navigate to={`/products/${id}`} replace />;
  const error = form.error ?? product.error;
  if (error) return <LoadError error={error} onRetry={form.retry} />;
  if (!form.ready || !product.data) return <LoadingText />;

  const back = `/products/${id}`;
  return (
    <SettingsPage title={t("catalog.edit.title")} backTo={back}>
      <EditProductForm
        product={product.data}
        categories={form.categories}
        data={form.data}
        onSaved={() => navigate(back, { replace: true })}
        onCancel={() => navigate(back)}
      />
    </SettingsPage>
  );
}
