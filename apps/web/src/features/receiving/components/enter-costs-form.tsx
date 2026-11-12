import { parseShillings, type Delivery } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/features/auth/components/form-error";
import { useCommandId } from "../hooks/use-command-id";
import { useEnterCosts } from "../hooks/use-delivery-mutations";

function cents(text: string): number | null {
  try {
    const value = parseShillings(text);
    return value > 0 && value <= 100_000_000_000 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Entering the cost of lines that arrived with "cost to be added" (F04 section 4.1, T7). Only
 * lines with a typed total are sent; the rest stay pending.
 */
export function EnterCostsForm({ delivery }: { delivery: Delivery }) {
  const { t } = useTranslation();
  const enter = useEnterCosts();
  const idFor = useCommandId();
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [tried, setTried] = useState(false);
  const pending = delivery.lines.filter((l) => l.costState === "pending");
  if (pending.length === 0) return null;

  const filled = pending.filter((l) => (totals[l.id] ?? "").trim() !== "");
  const invalid = filled.some((l) => cents(totals[l.id] ?? "") === null);

  const send = async () => {
    setTried(true);
    setError(null);
    if (invalid || filled.length === 0) return;
    const body = {
      lines: filled.map((l) => ({ lineId: l.id, lineTotalCents: cents(totals[l.id] ?? "") ?? 0 })),
    };
    try {
      await enter.mutateAsync({ id: delivery.id, body: { commandId: idFor(body), ...body } });
      setTotals({});
      setTried(false);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <Card className="flex flex-col gap-4 sm:p-5">
      <h2 className="font-heading text-xl font-bold text-slate-900">
        {t("receiving.costs.title")}
      </h2>
      <p className="text-slate-800">{t("receiving.costs.hint")}</p>
      {pending.map((line) => (
        <div key={line.id}>
          <Label htmlFor={`cost-${line.id}`}>
            {t("receiving.costs.lineTotal", { name: line.product.name })}
          </Label>
          <Input
            id={`cost-${line.id}`}
            inputMode="decimal"
            autoComplete="off"
            value={totals[line.id] ?? ""}
            onChange={(e) => setTotals({ ...totals, [line.id]: e.target.value })}
          />
        </div>
      ))}
      {tried && (invalid || filled.length === 0) && (
        <Alert variant="error">
          {t(invalid ? "receiving.issue.cost" : "receiving.costs.nothing")}
        </Alert>
      )}
      <FormError error={error} />
      <Button disabled={enter.isPending} onClick={() => void send()}>
        {enter.isPending ? t("common.working") : t("receiving.costs.save")}
      </Button>
    </Card>
  );
}
