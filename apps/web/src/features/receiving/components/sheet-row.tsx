import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { rowPieces } from "../sheet-math";
import type { SheetRow } from "../sheet-state";
import { parseUnits, type ParsedUnit } from "../unit-lines";
import { RowCostCell } from "./row-cost-cell";
import { UnitEditor } from "./unit-editor";

/** Column widths of the grid on tablets and computers; the header row uses the same. */
export const SHEET_COLUMNS =
  "md:grid md:grid-cols-[minmax(10rem,1fr)_5rem_7rem_15rem_6rem_3rem] md:items-start md:gap-3";

interface Props {
  row: SheetRow;
  canSeeCost: boolean;
  deliveryUnits: ParsedUnit[];
  onPatch: (patch: Partial<Omit<SheetRow, "key" | "product">>) => void;
  onRemove: () => void;
}

/** One product of the delivery: a compact card on phones, a grid row on larger screens. */
export function SheetRowView({ row, canSeeCost, deliveryUnits, onPatch, onRemove }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const tracking = row.product.trackingType;
  const packs = row.product.packUnits.filter((p) => p.active);
  const pieces = rowPieces(row);
  const entered = tracking === "quantity" ? 0 : parseUnits(row.unitsText, tracking).length;
  const complete = pieces !== null && entered === pieces;

  return (
    <div
      role="group"
      aria-label={row.product.name}
      className={`flex flex-col gap-3 py-3 ${SHEET_COLUMNS}`}
    >
      <p className="break-words text-lg font-semibold text-slate-900">{row.product.name}</p>
      <div>
        <Label className="md:sr-only" htmlFor={`qty-${row.key}`}>
          {t("receiving.row.quantity")}
        </Label>
        <Input
          id={`qty-${row.key}`}
          inputMode="numeric"
          autoComplete="off"
          value={row.quantity}
          onChange={(e) => onPatch({ quantity: e.target.value })}
        />
      </div>
      <div>
        <Label className="md:sr-only" htmlFor={`unit-${row.key}`}>
          {t("receiving.row.unit")}
        </Label>
        {packs.length > 0 ? (
          <Select
            id={`unit-${row.key}`}
            className="w-full"
            value={row.packUnitId}
            onChange={(e) => onPatch({ packUnitId: e.target.value })}
          >
            <option value="">{row.product.baseUnit}</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {t("receiving.row.packOption", { name: p.name, size: p.size })}
              </option>
            ))}
          </Select>
        ) : (
          <p id={`unit-${row.key}`} className="min-h-tap py-3 text-slate-900">
            {row.product.baseUnit}
          </p>
        )}
      </div>
      {canSeeCost ? (
        <RowCostCell row={row} onPatch={onPatch} />
      ) : (
        <p className="py-3 text-slate-700">{t("receiving.cost.toBeAdded")}</p>
      )}
      {tracking !== "quantity" ? (
        <Button
          variant={complete ? "secondary" : "primary"}
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown aria-hidden className="h-4 w-4" />
          ) : (
            <ChevronRight aria-hidden className="h-4 w-4" />
          )}
          {t(tracking === "imei" ? "receiving.row.imeis" : "receiving.row.serials", {
            count: entered,
            pieces: pieces ?? 0,
          })}
        </Button>
      ) : (
        <span />
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("receiving.row.remove", { name: row.product.name })}
        onClick={onRemove}
      >
        <Trash2 aria-hidden className="h-5 w-5" />
      </Button>
      {open && tracking !== "quantity" && (
        <div className="md:col-span-6">
          <UnitEditor
            tracking={tracking}
            text={row.unitsText}
            onChange={(unitsText) => onPatch({ unitsText })}
            pieces={pieces}
            deliveryUnits={deliveryUnits}
          />
        </div>
      )}
    </div>
  );
}
