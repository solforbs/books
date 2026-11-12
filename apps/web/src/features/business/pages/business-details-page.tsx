import { updateBusinessRequestSchema, type Business } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { LoadError, LoadingText } from "@/components/load-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useBusiness, useUpdateBusiness } from "../hooks/use-business";

type TextField = "name" | "address" | "phone" | "email" | "kraPin" | "footerNote";
const TEXT_FIELDS: { field: TextField; inputMode?: "tel" | "email"; hint?: boolean }[] = [
  { field: "name" },
  { field: "address", hint: true },
  { field: "phone", inputMode: "tel" },
  { field: "email", inputMode: "email" },
  { field: "kraPin", hint: true },
  { field: "footerNote", hint: true },
];

function BusinessForm({ business }: { business: Business }) {
  const { t } = useTranslation();
  const update = useUpdateBusiness();
  const [values, setValues] = useState<Record<TextField, string>>({
    name: business.name,
    address: business.address ?? "",
    phone: business.phone ?? "",
    email: business.email ?? "",
    kraPin: business.kraPin ?? "",
    footerNote: business.footerNote ?? "",
  });
  const [vatEnabled, setVatEnabled] = useState(business.vatEnabled);
  const [hidePrices, setHidePrices] = useState(business.hidePricesFromStorekeepers);
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.reset();
    const parsed = updateBusinessRequestSchema.safeParse({
      ...values,
      vatEnabled,
      hidePricesFromStorekeepers: hidePrices,
    });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    update.mutate(parsed.data);
  };

  return (
    <Card className="sm:p-6">
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {TEXT_FIELDS.map(({ field, inputMode, hint }) => (
          <FormField
            key={field}
            label={t(`businessDetails.${field}`)}
            hint={hint ? t(`businessDetails.${field}Hint`) : undefined}
            error={fieldError(field)}
          >
            {(a11y) => (
              <Input
                {...a11y}
                inputMode={inputMode}
                value={values[field]}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            )}
          </FormField>
        ))}
        <Switch
          label={t("businessDetails.vat")}
          description={t("businessDetails.vatHint")}
          checked={vatEnabled}
          onChange={setVatEnabled}
        />
        <Switch
          label={t("businessDetails.hidePrices")}
          description={t("businessDetails.hidePricesHint")}
          checked={hidePrices}
          onChange={setHidePrices}
        />
        <FormError error={update.error} />
        {update.isSuccess && <Alert variant="success">{t("common.saved")}</Alert>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? t("common.working") : t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

/** Settings -> Business details: used on receipts and every other document. */
export function BusinessDetailsPage() {
  const { t } = useTranslation();
  const { data, error, refetch } = useBusiness();
  return (
    <SettingsPage title={t("settings.business.title")} intro={t("businessDetails.intro")}>
      {error && <LoadError error={error} onRetry={() => void refetch()} />}
      {!error && !data && <LoadingText />}
      {data && <BusinessForm key={data.id} business={data} />}
    </SettingsPage>
  );
}
