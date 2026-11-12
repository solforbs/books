import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebounced } from "@/features/catalog/hooks/use-debounced";
import { useCurrentLocation } from "@/features/locations/hooks/current-location";
import { StockRowView } from "../components/stock-row";
import { UnitLookup } from "../components/unit-lookup";
import { useStockList } from "../hooks/use-stock";

/** What we have, by product and location (read only), and the IMEI or serial lookup. */
export function StockPage() {
  const { t } = useTranslation();
  const { locations } = useCurrentLocation();
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const q = useDebounced(search.trim());
  const list = useStockList({ q, locationId });
  const rows = list.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-slate-900">{t("stock.title")}</h1>
      <UnitLookup />
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
          />
          <Input
            type="search"
            aria-label={t("stock.search")}
            placeholder={t("stock.search")}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {locations.length > 1 && (
          <Select
            aria-label={t("stock.location")}
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            <option value="">{t("stock.allLocations")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      {list.error ? (
        <LoadError error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <LoadingText />
      ) : rows.length === 0 ? (
        <Card className="sm:p-5">
          <p className="text-lg font-semibold text-slate-900">
            {t(q !== "" || locationId !== "" ? "stock.noMatch" : "stock.empty")}
          </p>
        </Card>
      ) : (
        <>
          <ul
            aria-label={t("stock.title")}
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {rows.map((row) => (
              <StockRowView key={`${row.productId}-${row.locationId}`} row={row} />
            ))}
          </ul>
          {list.hasNextPage && (
            <Button
              variant="secondary"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? t("common.working") : t("stock.loadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
