import type { StockRow } from "@books/shared";
import { useTranslation } from "react-i18next";
import { shillings } from "@/features/receiving/format";

/** One product at one location: what is on hand, plus anything that needs attention. */
export function StockRowView({ row }: { row: StockRow }) {
  const { t } = useTranslation();
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
      <span className="min-w-0 flex-1 basis-48">
        <span className="block break-words text-lg font-semibold text-slate-900">
          {row.productName}
        </span>
        <span className="block text-sm text-slate-700">{row.locationName}</span>
      </span>
      <span className="text-right">
        <span className="block font-heading text-xl font-bold text-slate-900">
          {t("stock.onHand", { count: row.onHand })}
        </span>
        {row.valueCents !== null && (
          <span className="block text-sm text-slate-700">
            {t("stock.value", { amount: shillings(row.valueCents) })}
          </span>
        )}
      </span>
      {(row.incomplete > 0 || row.costMissing > 0) && (
        <span className="flex basis-full flex-wrap gap-3 text-sm font-semibold text-amber-900">
          {row.incomplete > 0 && <span>{t("stock.incomplete", { count: row.incomplete })}</span>}
          {row.costMissing > 0 && <span>{t("stock.costMissing", { count: row.costMissing })}</span>}
        </span>
      )}
    </li>
  );
}
