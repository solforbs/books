import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { CreateProductForm } from "../components/create-product-form";
import { useProductFormData } from "../hooks/use-product-form-data";
import { useProduct } from "../hooks/use-products";
import { emptyValues, valuesFromProduct } from "../product-form-values";

/**
 * Add one product. `?copy=ID` opens the form filled from another product (without barcodes);
 * `?barcode=CODE` starts with the barcode that was scanned and not found.
 */
export function AddProductPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const copyId = params.get("copy") ?? "";
  const barcode = params.get("barcode") ?? "";
  const form = useProductFormData();
  const source = useProduct(copyId);

  const error = form.error ?? (copyId ? source.error : null);
  if (error) return <LoadError error={error} onRetry={form.retry} />;
  if (!form.ready || (copyId && !source.data)) return <LoadingText />;

  const initial = source.data
    ? valuesFromProduct(source.data, { copy: true, withPrices: form.data.canSetPrices })
    : emptyValues({ barcodes: barcode ? [barcode] : [] });

  return (
    <SettingsPage
      title={t(copyId ? "catalog.copy.title" : "catalog.add.title")}
      backTo={copyId ? `/products/${copyId}` : "/products"}
    >
      <CreateProductForm
        initial={initial}
        categories={form.categories}
        data={form.data}
        onSaved={(product) => navigate(`/products/${product.id}`, { replace: true })}
        onCancel={() => navigate(copyId ? `/products/${copyId}` : "/products")}
      />
    </SettingsPage>
  );
}
