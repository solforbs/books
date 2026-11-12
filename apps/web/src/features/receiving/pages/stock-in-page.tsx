import { useTranslation } from "react-i18next";
import { MoreSection } from "@/components/more-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCurrentLocation } from "@/features/locations/hooks/current-location";
import { DeliveryError } from "../components/delivery-error";
import { PaymentStep } from "../components/payment-step";
import { SheetGrid } from "../components/sheet-grid";
import { SupplierPicker } from "../components/supplier-picker";
import { TotalsBar } from "../components/totals-bar";
import { useStockInSheet } from "../hooks/use-stock-in-sheet";

/** Stock in (F04 sections 2 and 3): supplier, location, the sheet, payment, Save. */
export function StockInPage() {
  const { t } = useTranslation();
  const { locations } = useCurrentLocation();
  const s = useStockInSheet();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-bold text-slate-900">{t("receiving.title")}</h1>

      <Card className="flex flex-col gap-4 sm:p-5">
        <SupplierPicker supplier={s.supplier} onChange={s.setSupplier} />
        {locations.length > 1 && (
          <div>
            <Label htmlFor="stock-in-location">{t("receiving.location")}</Label>
            <Select
              id="stock-in-location"
              value={s.locationId}
              onChange={(e) => s.setLocation(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <MoreSection label={t("receiving.invoice.more")}>
          <div>
            <Label htmlFor="invoice-number">{t("receiving.invoice.number")}</Label>
            <Input
              id="invoice-number"
              maxLength={50}
              value={s.invoiceNumber}
              onChange={(e) => s.setInvoiceNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="delivery-note">{t("receiving.invoice.note")}</Label>
            <Input
              id="delivery-note"
              maxLength={300}
              value={s.note}
              onChange={(e) => s.setNote(e.target.value)}
            />
          </div>
        </MoreSection>
      </Card>

      <SheetGrid
        rows={s.rows}
        canSeeCost={s.canSeeCost}
        deliveryUnits={s.deliveryUnits}
        onAdd={s.addProduct}
        onPatch={s.patchRow}
        onRemove={s.removeRow}
      />

      {s.rows.length > 0 && <TotalsBar totals={s.totals} canSeeCost={s.canSeeCost} />}

      {s.incomplete.length > 0 && (
        <Card className="sm:p-5">
          <Switch
            label={t("receiving.incomplete.label")}
            description={t("receiving.incomplete.hint")}
            checked={s.allowIncomplete}
            onChange={s.setAllowIncomplete}
          />
        </Card>
      )}

      {s.canPay && s.supplier && s.rows.length > 0 && (
        <Card className="sm:p-5">
          <PaymentStep
            supplier={s.supplier}
            totals={s.totals}
            places={s.places}
            draft={s.payment}
            onDraft={s.setPayment}
            onRule={s.setPaymentRule}
          />
        </Card>
      )}

      {s.issues.length > 0 && (
        <Alert variant="error">
          <p className="font-semibold">{t("receiving.issue.title")}</p>
          <ul className="list-disc pl-5">
            {s.issues.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </Alert>
      )}
      <DeliveryError
        error={s.error}
        canConfirmSoldBefore={s.canConfirmSoldBefore}
        onConfirmSoldBefore={s.saveConfirmed}
        busy={s.saving}
      />
      <Button disabled={s.saving} onClick={s.save}>
        {s.saving ? t("common.working") : t("receiving.save")}
      </Button>
    </section>
  );
}
