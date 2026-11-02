import {
  createLocationRequestSchema,
  updateLocationRequestSchema,
  type Location,
} from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChoiceGroup } from "@/components/choice-group";
import { FormField } from "@/components/form-field";
import { MoreSection } from "@/components/more-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { useCreateLocation, useUpdateLocation } from "../hooks/use-locations";

interface LocationFormProps {
  /** Edit this location; without it the form adds a new one. */
  location?: Location;
  onDone: () => void;
}

/** Add: name and Shop/Store only. Selling and price list have defaults and sit behind More. */
export function LocationForm({ location, onDone }: LocationFormProps) {
  const { t } = useTranslation();
  const create = useCreateLocation();
  const update = useUpdateLocation();
  const mutation = location ? update : create;
  const [name, setName] = useState(location?.name ?? "");
  const [type, setType] = useState<Location["type"]>(location?.type ?? "shop");
  // Until changed by hand, "can sell" follows the type: shops sell, stores don't (F02 §3).
  const [canSell, setCanSell] = useState<boolean | null>(location?.canSell ?? null);
  const [priceList, setPriceList] = useState<Location["priceList"]>(
    location?.priceList ?? "retail",
  );
  const { fieldError, showIssues, clear } = useFieldErrors();
  const sells = canSell ?? type === "shop";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (location) {
      const parsed = updateLocationRequestSchema.safeParse({ name, canSell: sells, priceList });
      if (!parsed.success) return showIssues(parsed.error.issues);
      clear();
      update.mutate({ id: location.id, body: parsed.data }, { onSuccess: onDone });
      return;
    }
    const parsed = createLocationRequestSchema.safeParse({ name, type, canSell: sells, priceList });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    create.mutate(parsed.data, { onSuccess: onDone });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <FormField label={t("locations.name")} error={fieldError("name")}>
        {(a11y) => <Input {...a11y} value={name} onChange={(e) => setName(e.target.value)} />}
      </FormField>
      {!location && (
        <ChoiceGroup
          legend={t("locations.type")}
          value={type}
          onChange={setType}
          choices={[
            { value: "shop", label: t("locations.types.shop") },
            { value: "store", label: t("locations.types.store") },
          ]}
        />
      )}
      <MoreSection>
        <Switch
          label={t("locations.canSell")}
          description={t("locations.canSellHint")}
          checked={sells}
          onChange={setCanSell}
        />
        <FormField label={t("locations.priceList")}>
          {(a11y) => (
            <Select
              {...a11y}
              value={priceList}
              onChange={(e) => setPriceList(e.target.value as Location["priceList"])}
            >
              <option value="retail">{t("locations.priceLists.retail")}</option>
              <option value="wholesale">{t("locations.priceLists.wholesale")}</option>
            </Select>
          )}
        </FormField>
      </MoreSection>
      <FormError error={mutation.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("common.working") : t("common.save")}
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={mutation.isPending}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
