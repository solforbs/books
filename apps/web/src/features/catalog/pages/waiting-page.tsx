import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { useAccess } from "@/features/access/hooks/use-access";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { WaitingItem } from "../components/waiting-item";
import { useCategories } from "../hooks/use-categories";
import { useWaitingProducts } from "../hooks/use-waiting-products";

/**
 * Products added by people who cannot approve. Only approvers can open this, and only while
 * something is waiting: otherwise the page does not exist for them (G1).
 */
export function WaitingPage() {
  const { t } = useTranslation();
  const { can } = useAccess();
  const waiting = useWaitingProducts();
  const categories = useCategories();

  if (!waiting.allowed) return <Navigate to="/products" replace />;
  if (waiting.query.error) {
    return <LoadError error={waiting.query.error} onRetry={() => void waiting.query.refetch()} />;
  }
  if (!waiting.query.data || !categories.data) return <LoadingText />;
  if (waiting.count === 0) return <Navigate to="/products" replace />;

  return (
    <SettingsPage
      title={t("catalog.waiting.title")}
      intro={t("catalog.waiting.intro")}
      backTo="/products"
    >
      <ul className="flex flex-col gap-3">
        {waiting.products.map((product) => (
          <li key={product.id}>
            <WaitingItem
              product={product}
              categories={categories.data}
              canSetPrices={can("set_prices")}
            />
          </li>
        ))}
      </ul>
    </SettingsPage>
  );
}
