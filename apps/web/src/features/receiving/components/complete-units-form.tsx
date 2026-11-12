import type { Delivery } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccess } from "@/features/access/hooks/use-access";
import { useCommandId } from "../hooks/use-command-id";
import { useCompleteUnits } from "../hooks/use-delivery-mutations";
import {
  countNumbers,
  parseUnits,
  toUnitInput,
  unitProblems,
  type ParsedUnit,
} from "../unit-lines";
import { DeliveryError } from "./delivery-error";
import { UnitEditor } from "./unit-editor";

/** The IMEIs or serials already saved on the delivery, so a number is never entered twice. */
function savedUnits(delivery: Delivery): ParsedUnit[] {
  return delivery.lines.flatMap((line) =>
    line.units.map((u) => ({ imei: u.imei ?? "", imei2: u.imei2 ?? "", serial: u.serial ?? "" })),
  );
}

/**
 * Completing an incomplete delivery (F04 section 4.3, T9): the numbers still missing are
 * scanned or pasted per line, and those units become sellable once saved.
 */
export function CompleteUnitsForm({ delivery }: { delivery: Delivery }) {
  const { t } = useTranslation();
  const { data: access } = useAccess();
  const complete = useCompleteUnits();
  const idFor = useCommandId();
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [tried, setTried] = useState(false);
  const lines = delivery.lines.filter(
    (l) => l.missingUnits > 0 && l.product.trackingType !== "quantity",
  );
  if (lines.length === 0) return null;

  const parsed = lines.map((line) => ({
    line,
    units: parseUnits(texts[line.id] ?? "", line.product.trackingType),
  }));
  const everything = [...savedUnits(delivery), ...parsed.flatMap((p) => p.units)];
  const counts = countNumbers(everything);
  const bad = parsed.some(
    ({ line, units }) =>
      units.length > line.missingUnits ||
      units.some((u) => unitProblems(u, line.product.trackingType, counts).length > 0),
  );
  const total = parsed.reduce((sum, p) => sum + p.units.length, 0);

  const send = async (confirmSoldBefore: boolean) => {
    setTried(true);
    setError(null);
    if (bad || total === 0) return;
    if (confirmSoldBefore) setConfirmed(true);
    const body = {
      confirmSoldBefore: confirmSoldBefore || confirmed,
      units: parsed.flatMap(({ line, units }) =>
        units.map((u) => ({ lineId: line.id, ...toUnitInput(u) })),
      ),
    };
    try {
      await complete.mutateAsync({ id: delivery.id, body: { commandId: idFor(body), ...body } });
      setTexts({});
      setTried(false);
    } catch (caught) {
      setError(caught);
    }
  };

  return (
    <Card className="flex flex-col gap-4 sm:p-5">
      <h2 className="font-heading text-xl font-bold text-slate-900">
        {t("receiving.complete.title")}
      </h2>
      <p className="text-slate-800">{t("receiving.complete.hint")}</p>
      {parsed.map(({ line }) => (
        <div
          key={line.id}
          role="group"
          aria-label={line.product.name}
          className="flex flex-col gap-2"
        >
          <p className="text-lg font-semibold text-slate-900">{line.product.name}</p>
          <UnitEditor
            tracking={line.product.trackingType as "imei" | "serial"}
            text={texts[line.id] ?? ""}
            onChange={(text) => setTexts({ ...texts, [line.id]: text })}
            pieces={line.missingUnits}
            deliveryUnits={everything}
          />
        </div>
      ))}
      {tried && (bad || total === 0) && (
        <Alert variant="error">
          {t(total === 0 ? "receiving.complete.nothing" : "receiving.complete.fix")}
        </Alert>
      )}
      <DeliveryError
        error={error}
        canConfirmSoldBefore={access?.role === "owner" || access?.role === "manager"}
        onConfirmSoldBefore={() => void send(true)}
        busy={complete.isPending}
      />
      <Button disabled={complete.isPending} onClick={() => void send(false)}>
        {complete.isPending ? t("common.working") : t("receiving.complete.save")}
      </Button>
    </Card>
  );
}
