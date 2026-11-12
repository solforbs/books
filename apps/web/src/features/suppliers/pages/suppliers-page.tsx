import { Plus, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LinkButton } from "@/components/link-button";
import { LoadError, LoadingText } from "@/components/load-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDebounced } from "@/features/catalog/hooks/use-debounced";
import { QuickSupplierForm } from "../components/quick-supplier-form";
import { SupplierRow } from "../components/supplier-row";
import { useSupplierAccess } from "../hooks/use-supplier-access";
import { useSupplierList, useWaitingSuppliers } from "../hooks/use-suppliers";

export function SuppliersPage() {
  const { t } = useTranslation();
  const { canManage, canQuickAdd } = useSupplierAccess();
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const q = useDebounced(search.trim());
  const waiting = useWaitingSuppliers();
  const list = useSupplierList({ q, status: showHidden ? "hidden" : undefined });

  const suppliers = list.data?.pages.flatMap((page) => page.suppliers) ?? [];
  const filtered = q !== "" || showHidden;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-slate-900">
          {t("suppliers.list.title")}
        </h1>
        <div className="flex flex-wrap gap-2">
          {canManage && suppliers.length > 0 && (
            <LinkButton to="/suppliers/new">
              <Plus aria-hidden className="h-5 w-5" />
              {t("suppliers.list.add")}
            </LinkButton>
          )}
          {canQuickAdd && !quickOpen && (
            <Button onClick={() => setQuickOpen(true)}>
              <UserPlus aria-hidden className="h-5 w-5" />
              {t("suppliers.quick.open")}
            </Button>
          )}
        </div>
      </div>

      {waiting.count > 0 && (
        <Link
          to="/suppliers/waiting"
          className="rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-3 font-semibold text-amber-900"
        >
          {t("suppliers.list.waitingLink", { count: waiting.count })}
        </Link>
      )}

      {added && <Alert variant="success">{t("suppliers.quick.added", { name: added })}</Alert>}
      {quickOpen && (
        <QuickSupplierForm
          onCancel={() => setQuickOpen(false)}
          onSaved={(supplier) => {
            setQuickOpen(false);
            setAdded(supplier.name);
          }}
        />
      )}

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600"
          />
          <Input
            type="search"
            aria-label={t("suppliers.list.search")}
            placeholder={t("suppliers.list.search")}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canManage && (
          <Switch
            label={t("suppliers.list.showHidden")}
            checked={showHidden}
            onChange={setShowHidden}
          />
        )}
      </div>

      {list.error ? (
        <LoadError error={list.error} onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <LoadingText />
      ) : suppliers.length === 0 ? (
        <Card className="flex flex-col items-start gap-3 sm:p-5">
          <p className="text-lg font-semibold text-slate-900">
            {t(filtered ? "suppliers.list.noMatch" : "suppliers.list.empty")}
          </p>
          {canManage && (
            <LinkButton to="/suppliers/new">
              <Plus aria-hidden className="h-5 w-5" />
              {t(filtered ? "suppliers.list.add" : "suppliers.list.addFirst")}
            </LinkButton>
          )}
        </Card>
      ) : (
        <>
          <ul
            aria-label={t("suppliers.list.title")}
            className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white"
          >
            {suppliers.map((s) => (
              <SupplierRow key={s.id} supplier={s} />
            ))}
          </ul>
          {list.hasNextPage && (
            <Button
              variant="secondary"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? t("common.working") : t("suppliers.list.loadMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
