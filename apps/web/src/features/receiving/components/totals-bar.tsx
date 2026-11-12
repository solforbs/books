import { formatShillings, type Cents } from "@books/shared";
import { useTranslation } from "react-i18next";
import type { SheetTotals } from "../build-delivery-request";

/** The bar at the bottom of the sheet: how many items and what the delivery costs (F04 section 2). */
export function TotalsBar({ totals, canSeeCost }: { totals: SheetTotals; canSeeCost: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      aria-label={t("receiving.totals.label")}
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl border-2 border-brand bg-brand-light px-4 py-3 text-brand-dark"
    >
      <p className="font-semibold">
        {t("receiving.totals.items", { count: totals.rows })}
        {" · "}
        {t("receiving.totals.pieces", { count: totals.pieces })}
      </p>
      {canSeeCost ? (
        <p className="font-heading text-xl font-bold" data-testid="total-cost">
          {t("receiving.totals.cost", {
            amount: formatShillings(totals.knownTotalCents as Cents, { decimals: false }),
          })}
          {totals.pendingLines > 0 && (
            <span className="ml-2 text-sm font-semibold">
              {t("receiving.totals.pending", { count: totals.pendingLines })}
            </span>
          )}
        </p>
      ) : (
        <p className="font-semibold">{t("receiving.cost.toBeAdded")}</p>
      )}
    </div>
  );
}
