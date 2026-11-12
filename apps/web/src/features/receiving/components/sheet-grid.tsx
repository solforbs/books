import type { Product } from "@books/shared";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import type { SheetRow } from "../sheet-state";
import type { ParsedUnit } from "../unit-lines";
import { ProductAdder } from "./product-adder";
import { SHEET_COLUMNS, SheetRowView } from "./sheet-row";

interface Props {
  rows: SheetRow[];
  canSeeCost: boolean;
  deliveryUnits: ParsedUnit[];
  onAdd: (product: Product) => void;
  onPatch: (key: string, patch: Partial<Omit<SheetRow, "key" | "product">>) => void;
  onRemove: (key: string) => void;
}

/** The sheet (F04 section 2): add by scan or typing, then one row per product. */
export function SheetGrid({ rows, canSeeCost, deliveryUnits, onAdd, onPatch, onRemove }: Props) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col gap-4 sm:p-5">
      <h2 className="font-heading text-xl font-bold text-slate-900">
        {t("receiving.sheet.title")}
      </h2>
      <ProductAdder onAdd={onAdd} />
      {rows.length === 0 ? (
        <p className="text-slate-700">{t("receiving.sheet.empty")}</p>
      ) : (
        <div>
          <div
            aria-hidden
            className={`hidden border-b-2 border-slate-300 pb-2 text-sm font-semibold text-slate-700 ${SHEET_COLUMNS}`}
          >
            <span>{t("receiving.row.product")}</span>
            <span>{t("receiving.row.quantity")}</span>
            <span>{t("receiving.row.unit")}</span>
            <span>{t("receiving.row.cost")}</span>
            <span />
            <span />
          </div>
          <div className="divide-y divide-slate-200">
            {rows.map((row) => (
              <SheetRowView
                key={row.key}
                row={row}
                canSeeCost={canSeeCost}
                deliveryUnits={deliveryUnits}
                onPatch={(patch) => onPatch(row.key, patch)}
                onRemove={() => onRemove(row.key)}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
