import { cents, formatShillings } from "@books/shared";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { FormError } from "@/features/auth/components/form-error";
import { isApiError } from "@/lib/api";

type Reason = { kind: "stock"; count: number } | { kind: "cash"; cents: number };

/**
 * Reads the `location_not_empty` details. The contract only says they "list what", so this
 * accepts an object of counts (keys mentioning stock/items or cash/drawer) or a list of names.
 */
export function notEmptyReasons(details: unknown): Reason[] {
  const reasons: Reason[] = [];
  const entries: [string, unknown][] = Array.isArray(details)
    ? details.map((d) => [String(d), true])
    : details && typeof details === "object"
      ? Object.entries(details)
      : [];
  for (const [key, value] of entries) {
    const amount = typeof value === "number" ? value : value === true ? 0 : null;
    if (amount === null || (typeof value === "number" && value <= 0)) continue;
    if (/stock|item|quantit/i.test(key)) reasons.push({ kind: "stock", count: amount });
    else if (/cash|drawer|money|balance/i.test(key)) {
      reasons.push({ kind: "cash", cents: Number.isSafeInteger(amount) ? amount : 0 });
    }
  }
  return reasons;
}

/** Explains clearly why a location could not be closed, and what to do about it. */
export function CloseLocationError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  if (!isApiError(error)) return <FormError error={error} />;
  if (error.code === "last_location") {
    return <Alert variant="error">{t("locations.lastLocation")}</Alert>;
  }
  if (error.code !== "location_not_empty") return <FormError error={error} />;
  const reasons = notEmptyReasons(error.details);
  return (
    <Alert variant="error">
      <p className="font-semibold">{t("locations.notEmpty.title")}</p>
      <ul className="mt-1 list-disc pl-5">
        {reasons.map((r, i) => (
          <li key={`${r.kind}-${i}`}>
            {r.kind === "stock"
              ? r.count > 0
                ? t("locations.notEmpty.stockCount", { count: r.count })
                : t("locations.notEmpty.stock")
              : r.cents > 0
                ? t("locations.notEmpty.cashAmount", { amount: formatShillings(cents(r.cents)) })
                : t("locations.notEmpty.cash")}
          </li>
        ))}
        {reasons.length === 0 && <li>{t("locations.notEmpty.generic")}</li>}
      </ul>
    </Alert>
  );
}
