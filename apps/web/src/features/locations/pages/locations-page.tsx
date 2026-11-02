import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadError, LoadingText } from "@/components/load-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { LocationForm } from "../components/location-form";
import { LocationRow } from "../components/location-row";
import { useLocations } from "../hooks/use-locations";
import { openFirst } from "../visible-locations";

const listClass = "divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white";

/** Settings -> Locations: open ones first, closed ones folded away under "Show closed". */
export function LocationsPage() {
  const { t } = useTranslation();
  const { data, error, refetch } = useLocations();
  const [adding, setAdding] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const addButton = !adding && (
    <Button onClick={() => setAdding(true)}>
      <Plus aria-hidden className="h-5 w-5" />
      {t("locations.add")}
    </Button>
  );

  if (error) return <LoadError error={error} onRetry={() => void refetch()} />;
  if (!data) return <LoadingText />;
  const { open, closed } = openFirst(data);

  return (
    <SettingsPage title={t("settings.locations.title")} action={addButton}>
      {adding && (
        <Card className="sm:p-5">
          <h2 className="mb-3 font-heading text-xl font-bold">{t("locations.addTitle")}</h2>
          <LocationForm onDone={() => setAdding(false)} />
        </Card>
      )}
      <ul className={listClass} aria-label={t("locations.openList")}>
        {open.map((l) => (
          <LocationRow key={l.id} location={l} />
        ))}
      </ul>
      {closed.length > 0 && (
        <>
          <Button variant="ghost" className="w-fit" onClick={() => setShowClosed((v) => !v)}>
            {showClosed
              ? t("locations.hideClosed")
              : t("locations.showClosed", { count: closed.length })}
          </Button>
          {showClosed && (
            <ul className={listClass} aria-label={t("locations.closedList")}>
              {closed.map((l) => (
                <LocationRow key={l.id} location={l} />
              ))}
            </ul>
          )}
        </>
      )}
    </SettingsPage>
  );
}
