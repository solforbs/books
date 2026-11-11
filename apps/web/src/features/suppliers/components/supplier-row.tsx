import type { Supplier } from "@books/shared";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ruleShort } from "../payment-rule-text";
import { CurrencyBadge, NeighbourBadge, StatusBadge } from "./supplier-badges";

/** One line of the supplier list: name, phone, payment rule in words, and a few badges. */
export function SupplierRow({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={`/suppliers/${supplier.id}`}
        className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-lg font-semibold text-slate-900">
            {supplier.name}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            {supplier.phone && <span>{supplier.phone}</span>}
            <span>{ruleShort(t, supplier.paymentRule)}</span>
            <CurrencyBadge currency={supplier.currency} />
            <NeighbourBadge isNeighbour={supplier.isNeighbour} />
            <StatusBadge status={supplier.status} />
          </span>
        </span>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-slate-500" />
      </Link>
    </li>
  );
}
