import { Layers, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccess } from "@/features/access/hooks/use-access";
import { ProductFilters } from "../components/product-filters";
import { ProductRow } from "../components/product-row";
import { ScanPanel } from "../components/scan-panel";
import { useDebounced } from "../hooks/use-debounced";
import { useCategories } from "../hooks/use-categories";
import { useProductList } from "../hooks/use-products";
import { useWaitingProducts } from "../hooks/use-waiting-products";

export function ProductsPage() {
  const { t } = useTranslation();
  const { can } = useAccess();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [scanning, setScanning] = useState(false);
  const q = useDebounced(search.trim());
  const categories = useCategories();
  const waiting = useWaitingProducts();
  const list = useProductList({ q, categoryId, status: showHidden ? "hidden" : undefined });

  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const products = list.data?.pages.flatMap((page) => page.products) ?? [];
  const filtered = q !== "" || categoryId !== "" || showHidden;
  const canAdd = can("add_products");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {t("catalog.list.title")}
        </h1>
        {canAdd && products.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <LinkButton to="/products/new">
              <Plus aria-hidden className="h-5 w-5" />
              {t("catalog.list.add")}
            </LinkButton>
            <LinkButton to="/products/bulk" variant="secondary">
              <Layers aria-hidden className="h-5 w-5" />
              {t("catalog.list.addSeveral")}
            </LinkButton>
          </div>
        )}
      </div>

      {waiting.count > 0 && (
        <Link
          to="/products/waiting"
          className="rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-3 font-semibold text-amber-900"
        >
          {t("catalog.list.waitingLink", { count: waiting.count })}
        </Link>
      )}

      <ProductFilters
        search={search}
        onSearch={setSearch}
        categories={categories.data ?? []}
        categoryId={categoryId}
        onCategory={setCategoryId}
        scanning={scanning}
        onToggleScan={() => setScanning((v) => !v)}
        canSeeHidden={can("manage_products")}
        showHidden={showHidden}
        onShowHidden={setShowHidden}
      />
      {scanning && <ScanPanel />}

      {list.error ? (
        <LoadError error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <LoadingText />
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 sm:p-5">
          <p className="text-lg font-semibold text-slate-900">
            {t(filtered ? "catalog.list.noMatch" : "catalog.list.empty")}
          </p>
          {canAdd && (
            <LinkButton to="/products/new">
              <Plus aria-hidden className="h-5 w-5" />
              {t(filtered ? "catalog.list.add" : "catalog.list.addFirst")}
            </LinkButton>
          )}
        </Card>
      ) : (
        <>
          <ul
            aria-label={t("catalog.list.title")}
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {products.map((p) => (
              <ProductRow key={p.id} product={p} categoryName={categoryNames.get(p.categoryId)} />
            ))}
          </ul>
          {list.hasNextPage && (
            <Button
              variant="secondary"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? t("common.working") : t("catalog.list.loadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
