import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { MoneyPlaceForm } from "../components/money-place-form";
import { MoneyPlaceRow } from "../components/money-place-row";
import { useLocations } from "../hooks/use-locations";
import { useMoneyPlaces } from "../hooks/use-money-places";

const listClass = "divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white";

/** Settings -> Money places: cash drawers (automatic) plus M-Pesa, bank and safe. */
export function MoneyPlacesPage() {
  const { t } = useTranslation();
  const places = useMoneyPlaces();
  const locations = useLocations();
  const [adding, setAdding] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const error = places.error ?? locations.error;
  if (error) {
    const retry = () => void Promise.all([places.refetch(), locations.refetch()]);
    return <LoadError error={error} onRetry={retry} />;
  }
  if (!places.data || !locations.data) return <LoadingText />;

  const allLocations = locations.data;
  const openLocations = allLocations.filter((l) => l.status === "open");
  const banks = places.data.filter((p) => p.type === "bank" && !p.hidden);
  const visible = places.data.filter((p) => !p.hidden);
  const hidden = places.data.filter((p) => p.hidden);
  const row = (p: (typeof visible)[number]) => (
    <MoneyPlaceRow
      key={p.id}
      place={p}
      allLocations={allLocations}
      openLocations={openLocations}
      banks={banks}
    />
  );

  const addButton = !adding && (
    <Button onClick={() => setAdding(true)}>
      <Plus aria-hidden className="h-5 w-5" />
      {t("moneyPlaces.add")}
    </Button>
  );

  return (
    <SettingsPage
      title={t("settings.moneyPlaces.title")}
      intro={t("moneyPlaces.intro")}
      action={addButton}
    >
      {adding && (
        <Card className="sm:p-5">
          <h2 className="mb-3 font-heading text-xl font-bold">{t("moneyPlaces.addTitle")}</h2>
          <MoneyPlaceForm locations={openLocations} banks={banks} onDone={() => setAdding(false)} />
        </Card>
      )}
      <ul className={listClass} aria-label={t("settings.moneyPlaces.title")}>
        {visible.map(row)}
      </ul>
      {hidden.length > 0 && (
        <>
          <Button variant="ghost" className="w-fit" onClick={() => setShowHidden((v) => !v)}>
            {showHidden
              ? t("moneyPlaces.hideHidden")
              : t("moneyPlaces.showHidden", { count: hidden.length })}
          </Button>
          {showHidden && <ul className={listClass}>{hidden.map(row)}</ul>}
        </>
      )}
    </SettingsPage>
  );
}
