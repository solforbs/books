import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import { shillings } from "@/features/receiving/format";
import { formatDateTime } from "@/features/staff/format";
import { useUnitLookup } from "../hooks/use-stock";

/** Find a phone or other serialised item by IMEI (either number) or serial. */
export function UnitLookup() {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState("");
  const [number, setNumber] = useState("");
  const query = useUnitLookup(number);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    // Spaces and dashes are cleaned like everywhere else numbers are entered.
    setNumber(text.replace(/[\s-]/g, ""));
  };

  return (
    <Card className="flex flex-col gap-3 sm:p-5">
      <form noValidate onSubmit={submit} className="flex flex-col gap-3">
        <FormField label={t("stock.lookup.label")} hint={t("stock.lookup.hint")}>
          {(a11y) => (
            <Input
              {...a11y}
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </FormField>
        <Button type="submit" className="w-fit">
          <Search aria-hidden className="h-5 w-5" />
          {t("stock.lookup.find")}
        </Button>
      </form>
      {number !== "" && query.isLoading && <LoadingText />}
      <FormError error={query.error} />
      {query.data && query.data.length === 0 && (
        <p className="font-semibold text-slate-900">{t("stock.lookup.none", { number })}</p>
      )}
      {query.data && query.data.length > 0 && (
        <ul className="divide-y divide-slate-200" aria-label={t("stock.lookup.results")}>
          {query.data.map((u) => (
            <li key={u.id} className="flex flex-col gap-0.5 py-3">
              <p className="text-lg font-semibold text-slate-900">{u.product.name}</p>
              <p className="text-slate-800">
                {[u.imei, u.imei2, u.serial].filter(Boolean).join(" / ")}
              </p>
              <p className="font-semibold text-slate-900">
                {t(`receiving.unitStatus.${u.status}`)}
                {" - "}
                {u.location.name}
              </p>
              <p className="text-sm text-slate-700">
                {t("stock.lookup.received", {
                  number: u.deliveryNumber,
                  when: formatDateTime(u.receivedAt, i18n.language),
                })}
                {u.costCents !== null &&
                  ` - ${t("stock.lookup.cost", { amount: shillings(u.costCents) })}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
