import type { Product } from "@books/shared";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useSeesPrices } from "../hooks/use-sees-prices";
import { showMoney } from "../money-input";
import { StatusBadge } from "./product-badges";

interface ProductRowProps {
  product: Product;
  categoryName: string | undefined;
}

/** One line of the product list: name, category, selling price and a status badge if needed. */
export function ProductRow({ product, categoryName }: ProductRowProps) {
  const { t } = useTranslation();
  const seesPrices = useSeesPrices();
  return (
    <li>
      <Link
        to={`/products/${product.id}`}
        className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block break-words text-lg font-semibold text-slate-900">
            {product.name}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            {categoryName}
            <StatusBadge status={product.status} />
          </span>
        </span>
        {seesPrices && product.retailPrice !== null && (
          <span className="shrink-0 font-semibold text-slate-900">
            {t("catalog.price", { amount: showMoney(product.retailPrice) })}
          </span>
        )}
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-slate-500" />
      </Link>
    </li>
  );
}
