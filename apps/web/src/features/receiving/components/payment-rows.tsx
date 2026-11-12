import type { MoneyPlace } from "@books/shared";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { PaymentRowDraft } from "../payment-draft";

interface Props {
  rows: PaymentRowDraft[];
  places: MoneyPlace[];
  onChange: (rows: PaymentRowDraft[]) => void;
}

/** Each payment comes from one money place; more than one place can be used (F04a scope 6). */
export function PaymentRows({ rows, places, onChange }: Props) {
  const { t } = useTranslation();
  const patch = (key: string, change: Partial<PaymentRowDraft>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const unused = places.find((p) => !rows.some((r) => r.moneyPlaceId === p.id));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1">
            <Label htmlFor={`place-${row.key}`}>{t("receiving.pay.from")}</Label>
            <Select
              id={`place-${row.key}`}
              className="w-full"
              value={row.moneyPlaceId}
              onChange={(e) => patch(row.key, { moneyPlaceId: e.target.value })}
            >
              <option value="">{t("receiving.pay.choosePlace")}</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Label htmlFor={`amount-${row.key}`}>{t("receiving.pay.amount")}</Label>
            <Input
              id={`amount-${row.key}`}
              inputMode="decimal"
              autoComplete="off"
              value={row.amount}
              onChange={(e) => patch(row.key, { amount: e.target.value })}
            />
          </div>
          {rows.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("receiving.pay.removePlace")}
              onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
            >
              <X aria-hidden className="h-5 w-5" />
            </Button>
          )}
        </div>
      ))}
      {unused && (
        <Button
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() =>
            onChange([
              ...rows,
              { key: `pay-${rows.length}-${Date.now()}`, moneyPlaceId: "", amount: "" },
            ])
          }
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t("receiving.pay.addPlace")}
        </Button>
      )}
    </div>
  );
}
