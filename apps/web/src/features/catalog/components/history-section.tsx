import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/features/staff/format";
import { useProductHistory } from "../hooks/use-products";
import { historyValueText, isPriceField } from "../history-format";

/** Who changed what and when. Price changes are listed again on their own for the owner. */
export function HistorySection({ productId }: { productId: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const history = useProductHistory(productId, open);
  const entries = history.data ?? [];
  const prices = entries.filter((e) => isPriceField(e.field));

  const line = (entry: (typeof entries)[number], index: number) => (
    <li key={index} className="px-3 py-2 text-sm">
      <p className="font-semibold text-slate-900">
        {t(`catalog.history.action.${entry.action}`, { defaultValue: entry.action })}
        {entry.field
          ? `: ${t(`catalog.history.field.${entry.field}`, { defaultValue: entry.field })}`
          : ""}
      </p>
      {(entry.before !== null || entry.after !== null) && (
        <p className="text-slate-800">
          {t("catalog.history.change", {
            before: historyValueText(entry.field, entry.before, t),
            after: historyValueText(entry.field, entry.after, t),
          })}
        </p>
      )}
      <p className="text-slate-700">
        {t("catalog.history.by", {
          name: entry.by.name,
          when: formatDateTime(entry.at, i18n.language),
        })}
      </p>
    </li>
  );

  return (
    <section className="flex flex-col gap-3">
      <Button
        variant="secondary"
        className="w-fit"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {t(open ? "catalog.history.hide" : "catalog.history.show")}
      </Button>
      {open && history.error && (
        <LoadError error={history.error} onRetry={() => void history.refetch()} />
      )}
      {open && !history.data && !history.error && <LoadingText />}
      {open && history.data && (
        <>
          {prices.length > 0 && (
            <div>
              <h2 className="font-heading text-xl font-bold">{t("catalog.history.prices")}</h2>
              <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {prices.map(line)}
              </ul>
            </div>
          )}
          <h2 className="font-heading text-xl font-bold">{t("catalog.history.title")}</h2>
          {entries.length === 0 ? (
            <p>{t("catalog.history.empty")}</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {entries.map(line)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
