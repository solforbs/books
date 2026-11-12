import type { Delivery } from "@books/shared";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { shillings } from "../format";

/** What arrived: product, quantity (and pieces), cost, and the IMEIs or serials received. */
export function DeliveryLines({ delivery }: { delivery: Delivery }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col gap-3 sm:p-5">
      <h2 className="font-heading text-xl font-bold text-slate-900">
        {t("receiving.delivery.arrived")}
      </h2>
      <ul className="divide-y divide-slate-200">
        {delivery.lines.map((line) => (
          <li key={line.id} aria-label={line.product.name} className="flex flex-col gap-1 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="break-words text-lg font-semibold text-slate-900">
                {line.product.name}
              </p>
              <p className="font-semibold text-slate-900">
                {line.packUnit
                  ? t("receiving.delivery.packQuantity", {
                      quantity: line.quantity,
                      name: line.packUnit.name,
                      pieces: line.pieces,
                    })
                  : t("receiving.delivery.pieces", { count: line.pieces })}
              </p>
            </div>
            <p className="text-slate-800">
              {line.costState === "pending"
                ? t("receiving.cost.toBeAdded")
                : line.lineTotalCents !== null
                  ? t("receiving.money", { amount: shillings(line.lineTotalCents) })
                  : ""}
            </p>
            {line.missingUnits > 0 && (
              <p className="font-semibold text-amber-900">
                {t("receiving.delivery.missingUnits", { count: line.missingUnits })}
              </p>
            )}
            {line.units.length > 0 && (
              <ul className="text-sm text-slate-700">
                {line.units.map((u) => (
                  <li key={u.id}>
                    {[u.imei, u.imei2, u.serial].filter(Boolean).join(" / ")}
                    {" - "}
                    {t(`receiving.unitStatus.${u.status}`)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
