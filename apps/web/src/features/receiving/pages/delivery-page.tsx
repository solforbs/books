import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { LinkButton } from "@/components/link-button";
import { LoadError, LoadingText } from "@/components/load-state";
import { Alert } from "@/components/ui/alert";
import { useAccess } from "@/features/access/hooks/use-access";
import { CompleteUnitsForm } from "../components/complete-units-form";
import { DeliveryLines } from "../components/delivery-lines";
import { DeliverySummary } from "../components/delivery-summary";
import { EnterCostsForm } from "../components/enter-costs-form";
import { useDelivery } from "../hooks/use-deliveries";

/** One delivery: what arrived, costs, paid and owed, and the forms to finish it (F04a). */
export function DeliveryPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true;
  const { can } = useAccess();
  const query = useDelivery(id);

  return (
    <section className="flex flex-col gap-4">
      <LinkButton to="/receiving" variant="ghost" className="w-fit px-0">
        <ArrowLeft aria-hidden className="h-5 w-5" />
        {t("receiving.delivery.back")}
      </LinkButton>
      {saved && <Alert variant="success">{t("receiving.delivery.saved")}</Alert>}
      {query.error ? (
        <LoadError error={query.error} onRetry={() => void query.refetch()} />
      ) : !query.data ? (
        <LoadingText />
      ) : (
        <>
          <DeliverySummary delivery={query.data} />
          <DeliveryLines delivery={query.data} />
          <CompleteUnitsForm delivery={query.data} />
          {can("see_cost_profit") && <EnterCostsForm delivery={query.data} />}
        </>
      )}
    </section>
  );
}
