import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { WaitingSupplierItem } from "../components/waiting-supplier-item";
import { useWaitingSuppliers } from "../hooks/use-suppliers";

/**
 * Suppliers added by name only. Only approvers can open this, and only while something is
 * waiting: otherwise the page does not exist for them (G1).
 */
export function WaitingSuppliersPage() {
  const { t } = useTranslation();
  const waiting = useWaitingSuppliers();

  if (!waiting.allowed) return <Navigate to="/suppliers" replace />;
  if (waiting.query.error) {
    return <LoadError error={waiting.query.error} onRetry={() => void waiting.query.refetch()} />;
  }
  if (!waiting.query.data) return <LoadingText />;
  if (waiting.count === 0) return <Navigate to="/suppliers" replace />;

  return (
    <SettingsPage
      title={t("suppliers.waiting.title")}
      intro={t("suppliers.waiting.intro")}
      backTo="/suppliers"
    >
      <ul className="flex flex-col gap-3">
        {waiting.suppliers.map((s) => (
          <li key={s.id}>
            <WaitingSupplierItem supplier={s} />
          </li>
        ))}
      </ul>
    </SettingsPage>
  );
}
