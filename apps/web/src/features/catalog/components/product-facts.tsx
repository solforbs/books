import type { Category, Location, Product } from "@books/shared";
import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/features/staff/format";
import { useSeesPrices } from "../hooks/use-sees-prices";
import { showMoney } from "../money-input";

interface ProductFactsProps {
  product: Product;
  category: Category | undefined;
  locations: Location[];
  /** Wholesale, minimum and per-location prices are for people who may set prices. */
  showAllPrices: boolean;
}

/** Every field of the product as a plain list. Cost is never here (F04). */
export function ProductFacts({ product, category, locations, showAllPrices }: ProductFactsProps) {
  const { t, i18n } = useTranslation();
  const seesPrices = useSeesPrices();
  const price = (v: number | null) =>
    v === null ? null : t("catalog.price", { amount: showMoney(v) });
  const facts: [string, string | null | undefined][] = [
    [t("catalog.form.category"), category?.name],
    [t("catalog.form.brand"), product.brand],
    [t("catalog.form.model"), product.model],
    [t("catalog.form.storage"), product.storage],
    [t("catalog.form.colour"), product.colour],
    [t("catalog.form.condition"), product.condition],
    [t("catalog.form.tracking"), t(`catalog.tracking.${product.trackingType}`)],
    [t("catalog.detail.baseUnit"), product.baseUnit],
    ...(seesPrices
      ? ([[t("catalog.form.retailPrice"), price(product.retailPrice)]] as [string, string | null][])
      : []),
    ...(seesPrices && showAllPrices
      ? ([
          [t("catalog.form.wholesalePrice"), price(product.wholesalePrice)],
          [t("catalog.form.minPrice"), price(product.minPrice)],
          ...product.locationPrices.map((l): [string, string | null] => [
            t("catalog.detail.priceAt", {
              name: locations.find((x) => x.id === l.locationId)?.name ?? "",
            }),
            [price(l.retailPrice), price(l.wholesalePrice)].filter(Boolean).join(" / "),
          ]),
        ] as [string, string | null][])
      : []),
    [t("catalog.form.vatType"), product.vatType ? t(`catalog.vat.${product.vatType}`) : null],
    [
      t("catalog.form.warranty"),
      product.warrantyMonths ? t("catalog.detail.months", { count: product.warrantyMonths }) : null,
    ],
    [t("catalog.form.canBeGivenFree"), product.canBeGivenFree ? t("catalog.detail.yes") : null],
    [
      t("catalog.detail.addedBy"),
      t("catalog.detail.addedByValue", {
        name: product.addedBy.name,
        when: formatDateTime(product.createdAt, i18n.language),
      }),
    ],
  ];
  return (
    <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[12rem_1fr]">
      {facts
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-sm font-semibold text-slate-700">{label}</dt>
            <dd className="break-words text-base text-slate-900">{value}</dd>
          </div>
        ))}
    </dl>
  );
}
