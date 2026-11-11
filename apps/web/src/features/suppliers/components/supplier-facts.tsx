import type { Supplier } from "@books/shared";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/features/staff/format";
import { ruleSentence } from "../payment-rule-text";
import { NeighbourBadge } from "./supplier-badges";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-700">{label}</dt>
      <dd className="break-words text-base text-slate-900">{children}</dd>
    </div>
  );
}

/** The supplier's details in plain words; empty optional fields are left out. */
export function SupplierFacts({ supplier }: { supplier: Supplier }) {
  const { t, i18n } = useTranslation();
  return (
    <dl className="flex flex-col gap-3">
      <Fact label={t("suppliers.form.phone")}>
        {supplier.phone ?? t("suppliers.detail.noPhone")}
      </Fact>
      <Fact label={t("suppliers.form.rule")}>
        <p>{ruleSentence(t, supplier.paymentRule)}</p>
        <p className="mt-1 text-sm text-slate-700">{t("suppliers.detail.ruleNote")}</p>
      </Fact>
      <Fact label={t("suppliers.form.currency")}>
        <span className="flex flex-wrap items-center gap-2">
          {supplier.currency}
          <NeighbourBadge isNeighbour={supplier.isNeighbour} />
        </span>
      </Fact>
      {supplier.kraPin && <Fact label={t("suppliers.form.kraPin")}>{supplier.kraPin}</Fact>}
      {supplier.marketOrLocation && (
        <Fact label={t("suppliers.form.market")}>{supplier.marketOrLocation}</Fact>
      )}
      {supplier.notes && <Fact label={t("suppliers.form.notes")}>{supplier.notes}</Fact>}
      <Fact label={t("suppliers.detail.added")}>
        {t("suppliers.waiting.addedBy", {
          name: supplier.addedBy.name,
          when: formatDateTime(supplier.createdAt, i18n.language),
        })}
      </Fact>
    </dl>
  );
}
