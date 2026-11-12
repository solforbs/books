import { isValidImei, normalizeImei, type TrackingType } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stockApi } from "@/features/stock/api/stock-api";
import { appendLine, countNumbers, parseUnits, unitProblems, type ParsedUnit } from "../unit-lines";

interface Props {
  tracking: Exclude<TrackingType, "quantity">;
  text: string;
  onChange: (text: string) => void;
  /** Pieces this row should end up with. */
  pieces: number | null;
  /** The units of the whole delivery, so the same IMEI on two rows is found. */
  deliveryUnits: ParsedUnit[];
}

function shown(unit: ParsedUnit): string {
  return unit.serial || [unit.imei, unit.imei2].filter(Boolean).join(" / ");
}

/**
 * IMEI or serial entry (F04 section 4.3): scan one at a time (Enter after each) or paste a
 * list. Wrong numbers are listed in red as you type; a scanned IMEI that is already in stock
 * is refused straight away (T8).
 */
export function UnitEditor({ tracking, text, onChange, pieces, deliveryUnits }: Props) {
  const { t } = useTranslation();
  const [scan, setScan] = useState("");
  const [blocked, setBlocked] = useState<string | null>(null);
  const [soldBefore, setSoldBefore] = useState(false);
  const units = parseUnits(text, tracking);
  const counts = countNumbers(deliveryUnits);
  const wrong = units.flatMap((unit) => {
    const problems = unitProblems(unit, tracking, counts);
    return problems.length > 0 ? [{ unit, problems }] : [];
  });

  const submitScan = async () => {
    const value = tracking === "serial" ? scan.trim() : normalizeImei(scan);
    if (!value) return;
    setBlocked(null);
    setSoldBefore(false);
    if (tracking === "imei") {
      if (!isValidImei(value)) return setBlocked(t("receiving.unit.problem.invalid"));
      if ((counts.get(value) ?? 0) > 0) return setBlocked(t("receiving.unit.problem.duplicate"));
      try {
        const { units: known } = await stockApi.lookup(value);
        const inStock = known.find((u) => u.status === "in_stock");
        if (inStock) {
          return setBlocked(
            t("receiving.unit.inStockAt", { place: inStock.location.name, imei: value }),
          );
        }
        setSoldBefore(known.length > 0);
      } catch {
        // Offline or a hiccup: the save checks every number again, so scanning continues.
      }
    }
    onChange(appendLine(text, value));
    setScan("");
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-slate-900" data-testid="unit-count">
        {t("receiving.unit.count", { count: units.length, pieces: pieces ?? 0 })}
      </p>
      <div>
        <Label htmlFor={`scan-${tracking}`}>
          {t(tracking === "imei" ? "receiving.unit.scanImei" : "receiving.unit.scanSerial")}
        </Label>
        <Input
          id={`scan-${tracking}`}
          autoComplete="off"
          inputMode={tracking === "imei" ? "numeric" : "text"}
          value={scan}
          onChange={(e) => setScan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            void submitScan();
          }}
        />
        {blocked && (
          <p role="alert" className="mt-1 text-sm font-semibold text-red-800">
            {blocked}
          </p>
        )}
        {soldBefore && (
          <p className="mt-1 text-sm text-amber-900">{t("receiving.unit.soldNote")}</p>
        )}
      </div>
      <div>
        <Label htmlFor={`paste-${tracking}`}>{t("receiving.unit.paste")}</Label>
        <textarea
          id={`paste-${tracking}`}
          rows={4}
          className="block w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-base text-slate-900 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/30"
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="mt-1 text-sm text-slate-700">
          {t(
            tracking === "imei" ? "receiving.unit.pasteHintImei" : "receiving.unit.pasteHintSerial",
          )}
        </p>
      </div>
      {wrong.length > 0 && (
        <Alert variant="error">
          <ul className="flex flex-col gap-1">
            {wrong.map(({ unit, problems }, index) => (
              <li key={`${shown(unit)}-${index}`}>
                <span className="font-semibold">{shown(unit)}</span>
                {": "}
                {problems.map((p) => t(`receiving.unit.problem.${p}`)).join(" ")}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}
