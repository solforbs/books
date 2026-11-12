import { ChevronRight, PackagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LinkButton } from "@/components/link-button";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/features/staff/format";
import { shillings } from "../format";
import { useDeliveryList } from "../hooks/use-deliveries";

/** Deliveries, newest first (F04a): number, supplier, place, date, cost and what is still owed. */
export function DeliveriesPage() {
  const { t, i18n } = useTranslation();
  const list = useDeliveryList({});
  const deliveries = list.data?.pages.flatMap((page) => page.deliveries) ?? [];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {t("receiving.list.title")}
        </h1>
        <LinkButton to="/receiving/new">
          <PackagePlus aria-hidden className="h-5 w-5" />
          {t("receiving.list.new")}
        </LinkButton>
      </div>
      {list.error ? (
        <LoadError error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <LoadingText />
      ) : deliveries.length === 0 ? (
        <Card className="sm:p-5">
          <p className="text-lg font-semibold text-slate-900">{t("receiving.list.empty")}</p>
        </Card>
      ) : (
        <>
          <ul
            aria-label={t("receiving.list.title")}
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {deliveries.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/receiving/${d.id}`}
                  className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-lg font-semibold text-slate-900">
                      {t("receiving.delivery.title", { number: d.number })}
                      {" - "}
                      {d.supplier.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 text-sm text-slate-700">
                      <span>{d.location.name}</span>
                      <span>{formatDateTime(d.createdAt, i18n.language)}</span>
                      {d.owedCents !== null && d.owedCents > 0 && (
                        <span className="font-semibold">
                          {t("receiving.list.owed", { amount: shillings(d.owedCents) })}
                        </span>
                      )}
                      {d.pendingCostLines > 0 && (
                        <span className="font-semibold text-amber-900">
                          {t("receiving.list.pendingCosts")}
                        </span>
                      )}
                      {d.incompleteUnits > 0 && (
                        <span className="font-semibold text-amber-900">
                          {t("receiving.list.incomplete")}
                        </span>
                      )}
                    </span>
                  </span>
                  {d.knownTotalCents !== null && (
                    <span className="shrink-0 font-semibold text-slate-900">
                      {t("receiving.money", { amount: shillings(d.knownTotalCents) })}
                    </span>
                  )}
                  <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <Button
              variant="secondary"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? t("common.working") : t("receiving.list.loadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
