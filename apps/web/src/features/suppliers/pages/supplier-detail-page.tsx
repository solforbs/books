import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { LinkButton } from "@/components/link-button";
import { LoadError, LoadingText } from "@/components/load-state";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { HideSupplierPanel } from "../components/hide-supplier-panel";
import { StatusBadge } from "../components/supplier-badges";
import { SupplierFacts } from "../components/supplier-facts";
import { useSupplierAccess } from "../hooks/use-supplier-access";
import { useSupplier } from "../hooks/use-suppliers";

export function SupplierDetailPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const { canManage, canApprove } = useSupplierAccess();
  const supplier = useSupplier(id);

  if (supplier.error) {
    return <LoadError error={supplier.error} onRetry={() => void supplier.refetch()} />;
  }
  if (!supplier.data) return <LoadingText />;
  const s = supplier.data;

  return (
    <SettingsPage title={s.name} backTo="/suppliers" action={<StatusBadge status={s.status} />}>
      {s.status === "waiting" && (
        <Alert variant="info">
          {t("suppliers.detail.waitingBanner")}{" "}
          {canApprove && (
            <Link to="/suppliers/waiting" className="font-semibold underline underline-offset-4">
              {t("suppliers.detail.completeLink")}
            </Link>
          )}
        </Alert>
      )}
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <LinkButton to={`/suppliers/${s.id}/edit`}>
            <Pencil aria-hidden className="h-5 w-5" />
            {t("common.edit")}
          </LinkButton>
        </div>
      )}
      <Card className="sm:p-5">
        <SupplierFacts supplier={s} />
      </Card>
      {canManage && <HideSupplierPanel supplier={s} />}
    </SettingsPage>
  );
}
