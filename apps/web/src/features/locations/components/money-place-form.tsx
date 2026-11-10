import {
  CREATABLE_MONEY_PLACE_TYPES,
  createMoneyPlaceRequestSchema,
  updateMoneyPlaceRequestSchema,
  type Location,
  type MoneyPlace,
} from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { CheckboxList } from "@/components/checkbox-list";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { useFieldErrors } from "@/features/auth/hooks/use-field-errors";
import { blankToUndefined } from "@/features/auth/validation";
import { useCreateMoneyPlace, useUpdateMoneyPlace } from "../hooks/use-money-places";

type CreatableType = (typeof CREATABLE_MONEY_PLACE_TYPES)[number];

interface MoneyPlaceFormProps {
  place?: MoneyPlace;
  /** Open locations the place can be linked to. */
  locations: Location[];
  /** Bank places a Paybill can settle to. */
  banks: MoneyPlace[];
  onDone: () => void;
}

/** Add or edit an M-Pesa Till/Paybill, bank or safe. Cash drawers are never edited here. */
export function MoneyPlaceForm({ place, locations, banks, onDone }: MoneyPlaceFormProps) {
  const { t } = useTranslation();
  const create = useCreateMoneyPlace();
  const update = useUpdateMoneyPlace();
  const mutation = place ? update : create;
  const [type, setType] = useState<CreatableType>(
    place && place.type !== "cash_drawer" ? place.type : "mpesa_till",
  );
  const [name, setName] = useState(place?.name ?? "");
  const [number, setNumber] = useState(place?.number ?? "");
  const [settlesTo, setSettlesTo] = useState(place?.settlesToId ?? "");
  // With one location there is nothing to choose, so it is ticked already (G2).
  const [locationIds, setLocationIds] = useState<string[]>(
    place?.locationIds ?? (locations.length === 1 && locations[0] ? [locations[0].id] : []),
  );
  const { fieldError, showIssues, clear } = useFieldErrors();
  const hasNumber = type !== "safe";
  const otherBanks = banks.filter((b) => b.id !== place?.id);
  const canSettle = type === "mpesa_paybill" && otherBanks.length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const settlesToId = canSettle && settlesTo ? settlesTo : undefined;
    if (place) {
      const parsed = updateMoneyPlaceRequestSchema.safeParse({
        name,
        locationIds,
        ...(hasNumber ? { number: number.trim() === "" ? null : number } : {}),
        ...(type === "mpesa_paybill" ? { settlesToId: settlesToId ?? null } : {}),
      });
      if (!parsed.success) return showIssues(parsed.error.issues);
      clear();
      update.mutate({ id: place.id, body: parsed.data }, { onSuccess: onDone });
      return;
    }
    const parsed = createMoneyPlaceRequestSchema.safeParse({
      type,
      name,
      number: hasNumber ? blankToUndefined(number) : undefined,
      settlesToId,
      locationIds,
    });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    create.mutate(parsed.data, { onSuccess: onDone });
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      {!place && (
        <FormField label={t("moneyPlaces.type")}>
          {(a11y) => (
            <Select
              {...a11y}
              value={type}
              onChange={(e) => setType(e.target.value as CreatableType)}
            >
              {CREATABLE_MONEY_PLACE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`moneyPlaces.types.${value}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      )}
      <FormField
        label={t("moneyPlaces.name")}
        hint={t("moneyPlaces.nameHint")}
        error={fieldError("name")}
      >
        {(a11y) => <Input {...a11y} value={name} onChange={(e) => setName(e.target.value)} />}
      </FormField>
      {hasNumber && (
        <FormField label={t(`moneyPlaces.number.${type}`)} error={fieldError("number")}>
          {(a11y) => (
            <Input
              {...a11y}
              inputMode={type === "bank" ? "text" : "numeric"}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          )}
        </FormField>
      )}
      {canSettle && (
        <FormField label={t("moneyPlaces.settlesTo")} hint={t("moneyPlaces.settlesToHint")}>
          {(a11y) => (
            <Select {...a11y} value={settlesTo} onChange={(e) => setSettlesTo(e.target.value)}>
              <option value="">{t("moneyPlaces.settlesToNone")}</option>
              {otherBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      )}
      <CheckboxList
        legend={t("moneyPlaces.locations")}
        options={locations.map((l) => ({ value: l.id, label: l.name }))}
        selected={locationIds}
        onChange={setLocationIds}
        error={fieldError("locationIds")}
      />
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
