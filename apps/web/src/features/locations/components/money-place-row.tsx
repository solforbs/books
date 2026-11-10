import type { Location, MoneyPlace } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useUpdateMoneyPlace } from "../hooks/use-money-places";
import { MoneyPlaceForm } from "./money-place-form";
import { MoneyPlaceIcon } from "./money-place-icon";

interface MoneyPlaceRowProps {
  place: MoneyPlace;
  /** Every known location, for showing names (closed ones too). */
  allLocations: Location[];
  openLocations: Location[];
  banks: MoneyPlace[];
}

/** One money place. Cash drawers belong to their location and have no actions. */
export function MoneyPlaceRow({ place, allLocations, openLocations, banks }: MoneyPlaceRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const update = useUpdateMoneyPlace();
  const isDrawer = place.type === "cash_drawer";
  const names = place.locationIds
    .map((id) => allLocations.find((l) => l.id === id)?.name)
    .filter(Boolean);
  const settlesTo = banks.find((b) => b.id === place.settlesToId);
  const facts = [
    t(`moneyPlaces.types.${place.type}`),
    place.number,
    settlesTo ? t("moneyPlaces.settlesToShort", { name: settlesTo.name }) : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <MoneyPlaceIcon type={place.type} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">{place.name}</p>
          <p className="text-sm text-slate-700">{facts.join(" · ")}</p>
          {names.length > 0 && <p className="text-sm text-slate-700">{names.join(", ")}</p>}
        </div>
        {!isDrawer && !editing && (
          <div className="flex gap-2">
            {!place.hidden && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                {t("common.edit")}
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: place.id, body: { hidden: !place.hidden } })}
            >
              {place.hidden ? t("moneyPlaces.unhide") : t("moneyPlaces.hide")}
            </Button>
          </div>
        )}
      </div>
      {editing && (
        <MoneyPlaceForm
          place={place}
          locations={openLocations}
          banks={banks}
          onDone={() => setEditing(false)}
        />
      )}
      <FormError error={update.error} />
    </li>
  );
}
