import type { Supplier } from "@books/shared";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LinkButton } from "@/components/link-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounced } from "@/features/catalog/hooks/use-debounced";
import { QuickSupplierForm } from "@/features/suppliers/components/quick-supplier-form";
import { StatusBadge } from "@/features/suppliers/components/supplier-badges";
import { useSupplierAccess } from "@/features/suppliers/hooks/use-supplier-access";
import { useSupplierList } from "@/features/suppliers/hooks/use-suppliers";
import { ruleShort } from "@/features/suppliers/payment-rule-text";

interface Props {
  supplier: Supplier | null;
  onChange: (supplier: Supplier | null) => void;
}

/**
 * Step 1 of stock in (F04 section 3): pick the supplier by typing part of the name. A new name
 * is saved as a waiting supplier through the same quick add the Suppliers page uses (F03).
 */
export function SupplierPicker({ supplier, onChange }: Props) {
  const { t } = useTranslation();
  const { canQuickAdd, canManage } = useSupplierAccess();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const q = useDebounced(search.trim());
  const list = useSupplierList({ q });
  const suppliers = list.data?.pages[0]?.suppliers ?? [];

  if (supplier) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">{t("receiving.supplier.label")}</p>
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
            {supplier.name}
            <StatusBadge status={supplier.status} />
          </p>
          <p className="text-sm text-slate-700">{ruleShort(t, supplier.paymentRule)}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => onChange(null)}>
          {t("receiving.supplier.change")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="supplier-search">{t("receiving.supplier.label")}</Label>
      <Input
        id="supplier-search"
        type="search"
        autoComplete="off"
        placeholder={t("receiving.supplier.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {suppliers.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {suppliers.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex min-h-tap w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                onClick={() => onChange(s)}
              >
                <span className="font-semibold text-slate-900">{s.name}</span>
                <span className="text-sm text-slate-700">{ruleShort(t, s.paymentRule)}</span>
                <StatusBadge status={s.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.data && suppliers.length === 0 && (
        <p className="text-sm text-slate-700">{t("receiving.supplier.none")}</p>
      )}
      {adding && canQuickAdd ? (
        <QuickSupplierForm
          onCancel={() => setAdding(false)}
          onSaved={(saved) => {
            setAdding(false);
            onChange(saved);
          }}
        />
      ) : canQuickAdd ? (
        <Button variant="secondary" className="w-fit" onClick={() => setAdding(true)}>
          <UserPlus aria-hidden className="h-5 w-5" />
          {t("suppliers.quick.open")}
        </Button>
      ) : canManage ? (
        <LinkButton to="/suppliers/new" target="_blank" variant="secondary" className="w-fit">
          <UserPlus aria-hidden className="h-5 w-5" />
          {t("receiving.supplier.addFull")}
        </LinkButton>
      ) : null}
    </div>
  );
}
