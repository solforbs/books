import { Copy, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { LinkButton } from "@/components/link-button";
import { LoadError, LoadingText } from "@/components/load-state";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { useAccess } from "@/features/access/hooks/use-access";
import { useSession } from "@/features/auth/hooks/use-session";
import { useLocations } from "@/features/locations/hooks/use-locations";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { BarcodeSection } from "../components/barcode-section";
import { HideProductPanel } from "../components/hide-product-panel";
import { HistorySection } from "../components/history-section";
import { PackSection } from "../components/pack-section";
import { StatusBadge } from "../components/product-badges";
import { ProductFacts } from "../components/product-facts";
import { useCategories } from "../hooks/use-categories";
import { useProduct } from "../hooks/use-products";

export function ProductDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const { can } = useAccess();
  const userId = useSession().data?.user.id;
  const product = useProduct(id);
  const categories = useCategories();
  const locations = useLocations();

  if (product.error)
    return <LoadError error={product.error} onRetry={() => void product.refetch()} />;
  if (!product.data) return <LoadingText />;
  const p = product.data;
  const canManage = can("manage_products");
  // The person who added a waiting product may give it a shop barcode right away.
  const canGenerate =
    canManage || (can("add_products") && p.status === "waiting" && p.addedBy.id === userId);

  return (
    <SettingsPage title={p.name} backTo="/products" action={<StatusBadge status={p.status} />}>
      {p.status === "waiting" && <Alert variant="info">{t("catalog.detail.waitingBanner")}</Alert>}
      {p.status === "merged" && p.mergedIntoId && (
        <Alert variant="info">
          {t("catalog.detail.mergedBanner")}{" "}
          <Link
            to={`/products/${p.mergedIntoId}`}
            className="font-semibold underline underline-offset-4"
          >
            {t("catalog.block.openExisting")}
          </Link>
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        {canManage && p.status !== "merged" && p.status !== "rejected" && (
          <LinkButton to={`/products/${p.id}/edit`}>
            <Pencil aria-hidden className="h-5 w-5" />
            {t("common.edit")}
          </LinkButton>
        )}
        {can("add_products") && (
          <LinkButton to={`/products/new?copy=${encodeURIComponent(p.id)}`} variant="secondary">
            <Copy aria-hidden className="h-5 w-5" />
            {t("catalog.detail.copy")}
          </LinkButton>
        )}
      </div>
      <Card className="sm:p-5">
        <ProductFacts
          product={p}
          category={categories.data?.find((c) => c.id === p.categoryId)}
          locations={locations.data ?? []}
          showAllPrices={can("set_prices")}
        />
      </Card>
      <BarcodeSection product={p} canManage={canManage} canGenerate={canGenerate} />
      <PackSection product={p} canManage={canManage} />
      {canManage && <HideProductPanel product={p} />}
      {canManage && <HistorySection productId={p.id} />}
    </SettingsPage>
  );
}
