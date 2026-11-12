import { formatShillings, type Cents } from "@books/shared";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { costEach, costPerPiece, rowCost, rowPieces, rowQuantity } from "../sheet-math";
import type { CostMode, SheetRow } from "../sheet-state";

const money = (cents: number) => formatShillings(cents as Cents, { decimals: true });

interface Props {
  row: SheetRow;
  onPatch: (patch: Partial<Pick<SheetRow, "costMode" | "cost">>) => void;
}

/**
 * Cost each or line total: the person types one, the screen shows the other and the cost per
 * piece (F04 sections 2 and 9.5). Leaving it empty means "price pending".
 */
export function RowCostCell({ row, onPatch }: Props) {
  const { t } = useTranslation();
  const cost = rowCost(row);
  const quantity = rowQuantity(row);
  const pieces = rowPieces(row);
  const invalid = cost.state === "invalid";
  const hints: string[] = [];
  if (cost.state === "known" && quantity !== null && pieces !== null) {
    if (row.costMode === "each") {
      hints.push(t("receiving.cost.lineTotal", { amount: money(cost.totalCents) }));
    } else {
      hints.push(t("receiving.cost.each", { amount: money(costEach(cost.totalCents, quantity)) }));
    }
    if (pieces !== quantity) {
      hints.push(
        t("receiving.cost.perPiece", { amount: money(costPerPiece(cost.totalCents, pieces)) }),
      );
    }
  }
  if (cost.state === "pending") hints.push(t("receiving.cost.pending"));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <div className="w-32 shrink-0">
          <Label className="md:sr-only" htmlFor={`mode-${row.key}`}>
            {t("receiving.cost.modeLabel")}
          </Label>
          <Select
            id={`mode-${row.key}`}
            className="w-full"
            value={row.costMode}
            onChange={(e) => onPatch({ costMode: e.target.value as CostMode })}
          >
            <option value="total">{t("receiving.cost.modeTotal")}</option>
            <option value="each">{t("receiving.cost.modeEach")}</option>
          </Select>
        </div>
        <div className="min-w-0 flex-1">
          <Label className="md:sr-only" htmlFor={`cost-${row.key}`}>
            {t("receiving.cost.amountLabel")}
          </Label>
          <Input
            id={`cost-${row.key}`}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={invalid}
            value={row.cost}
            onChange={(e) => onPatch({ cost: e.target.value })}
          />
        </div>
      </div>
      {invalid && <p className="text-sm font-semibold text-red-800">{t("receiving.issue.cost")}</p>}
      {hints.length > 0 && <p className="text-sm text-slate-700">{hints.join(" · ")}</p>}
    </div>
  );
}
