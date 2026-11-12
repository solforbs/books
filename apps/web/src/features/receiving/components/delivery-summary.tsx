import type { Delivery } from "@books/shared";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ruleShort } from "@/features/suppliers/payment-rule-text";
import { formatDateTime } from "@/features/staff/format";
import { formatDate, shillings } from "../format";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-slate-700">{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

/** Who, where, when, and what was paid and is still owed (money only for people who may see it). */
export function DeliverySummary({ delivery }: { delivery: Delivery }) {
  const { t, i18n } = useTranslation();
  const moneyKnown = delivery.knownTotalCents !== null;
  const placeName = (id: string) =>
    delivery.payments.find((p) => p.moneyPlace.id === id)?.moneyPlace.name ?? "";
  return (
    <Card className="flex flex-col gap-3 sm:p-5">
      <h1 className="font-heading text-2xl font-bold text-slate-900">
        {t("receiving.delivery.title", { number: delivery.number })}
      </h1>
      {delivery.warnings.map((w) => (
        <Alert key={w.moneyPlaceId} variant="info">
          {t("receiving.delivery.drawerNegative", { place: placeName(w.moneyPlaceId) })}
        </Alert>
      ))}
      <dl className="divide-y divide-slate-200">
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-slate-700">{t("receiving.delivery.supplier")}</dt>
          <dd className="text-right font-semibold">
            <Link
              to={`/suppliers/${delivery.supplier.id}`}
              className="text-brand-dark underline underline-offset-4"
            >
              {delivery.supplier.name}
            </Link>
          </dd>
        </div>
        <Fact label={t("receiving.delivery.location")} value={delivery.location.name} />
        <Fact
          label={t("receiving.delivery.received")}
          value={formatDateTime(delivery.createdAt, i18n.language)}
        />
        <Fact label={t("receiving.delivery.by")} value={delivery.createdBy.name} />
        {delivery.invoiceNumber && (
          <Fact label={t("receiving.delivery.invoice")} value={delivery.invoiceNumber} />
        )}
        {delivery.note && <Fact label={t("receiving.delivery.note")} value={delivery.note} />}
        {moneyKnown && (
          <>
            <Fact
              label={t("receiving.delivery.total")}
              value={t("receiving.money", { amount: shillings(delivery.knownTotalCents ?? 0) })}
            />
            <Fact
              label={t("receiving.delivery.paid")}
              value={t("receiving.money", { amount: shillings(delivery.paidCents ?? 0) })}
            />
            <Fact
              label={t("receiving.delivery.owed")}
              value={t("receiving.money", { amount: shillings(delivery.owedCents ?? 0) })}
            />
            <Fact label={t("receiving.delivery.rule")} value={ruleShort(t, delivery.paymentRule)} />
            {delivery.dueDate && (
              <Fact
                label={t("receiving.delivery.due")}
                value={formatDate(delivery.dueDate, i18n.language)}
              />
            )}
          </>
        )}
      </dl>
      {delivery.pendingCostLines > 0 && (
        <p className="font-semibold text-amber-900">
          {t("receiving.delivery.pendingLines", { count: delivery.pendingCostLines })}
        </p>
      )}
      {delivery.incompleteUnits > 0 && (
        <p className="font-semibold text-amber-900">
          {t("receiving.delivery.incompleteUnits", { count: delivery.incompleteUnits })}
        </p>
      )}
      {delivery.payments.length > 0 && (
        <ul className="text-slate-800">
          {delivery.payments.map((p) => (
            <li key={p.moneyPlace.id}>
              {t("receiving.delivery.paidFrom", {
                place: p.moneyPlace.name,
                amount: shillings(p.amountCents),
              })}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
