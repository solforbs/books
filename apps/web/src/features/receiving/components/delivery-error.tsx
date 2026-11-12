import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { isApiError } from "@/lib/api";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * What the server says about the IMEI. The contract does not define `details` for these
 * codes, so every field is optional and the plain message is the fallback (OPEN-QUESTIONS).
 */
function imeiDetails(details: unknown): { imei?: string; place?: string; soldOn?: string } {
  if (typeof details !== "object" || details === null) return {};
  const d = details as Record<string, unknown>;
  const location = typeof d.location === "object" && d.location !== null ? d.location : {};
  const out: { imei?: string; place?: string; soldOn?: string } = {};
  const imei = text(d.imei);
  const place = text(d.locationName) ?? text((location as Record<string, unknown>).name);
  const soldOn = text(d.soldAt) ?? text(d.soldOn);
  if (imei) out.imei = imei;
  if (place) out.place = place;
  if (soldOn) out.soldOn = soldOn;
  return out;
}

interface Props {
  error: unknown;
  /** Owners and managers may confirm an IMEI that was sold before (F04 section 4.3). */
  canConfirmSoldBefore: boolean;
  onConfirmSoldBefore: () => void;
  busy: boolean;
}

/** One clear message for a failed delivery request; the IMEI errors name the number. */
export function DeliveryError({ error, canConfirmSoldBefore, onConfirmSoldBefore, busy }: Props) {
  const { t } = useTranslation();
  if (!error) return null;
  if (isApiError(error) && error.code === "imei_in_stock") {
    const { imei, place } = imeiDetails(error.details);
    return (
      <Alert variant="error">
        {place
          ? t("receiving.error.inStockAt", { imei: imei ?? "", place })
          : t("errors.imei_in_stock")}
      </Alert>
    );
  }
  if (isApiError(error) && error.code === "imei_sold_before") {
    const { imei } = imeiDetails(error.details);
    return (
      <Alert variant="error" className="flex flex-col gap-3">
        <p>
          {imei ? t("receiving.error.soldBeforeNumber", { imei }) : t("errors.imei_sold_before")}
        </p>
        {canConfirmSoldBefore ? (
          <Button disabled={busy} onClick={onConfirmSoldBefore}>
            {t("receiving.error.confirmSoldBefore")}
          </Button>
        ) : (
          <p className="font-semibold">{t("receiving.error.askOwner")}</p>
        )}
      </Alert>
    );
  }
  return <FormError error={error} />;
}
