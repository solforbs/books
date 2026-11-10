import { MapPin } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "@/components/ui/select";
import { useCurrentLocation } from "../hooks/current-location";

/** Top-bar picker. With a single location there is nothing to choose, so it is not shown (G2). */
export function LocationSwitcher() {
  const { t } = useTranslation();
  const id = useId();
  const { locations, current, select } = useCurrentLocation();
  if (locations.length <= 1 || !current) return null;
  return (
    <div className="flex items-center gap-2">
      <MapPin aria-hidden className="h-5 w-5 text-brand-dark" />
      <label htmlFor={id} className="sr-only">
        {t("shell.location")}
      </label>
      <Select id={id} value={current.id} onChange={(e) => select(e.target.value)}>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
