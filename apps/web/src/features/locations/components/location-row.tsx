import type { Location } from "@books/shared";
import { Store, Warehouse } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useCloseLocation, useReopenLocation } from "../hooks/use-locations";
import { CloseLocationError } from "./close-location-error";
import { LocationForm } from "./location-form";

type Mode = "view" | "edit" | "confirmClose";

/** One location with its actions: Edit and Close when open, Reopen when closed. */
export function LocationRow({ location }: { location: Location }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("view");
  const close = useCloseLocation();
  const reopen = useReopenLocation();
  const Icon = location.type === "shop" ? Store : Warehouse;
  const open = location.status === "open";

  const facts = [
    t(`locations.types.${location.type}`),
    location.canSell ? t("locations.sells") : t("locations.noSelling"),
    t(`locations.priceLists.${location.priceList}`),
  ];

  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Icon aria-hidden className="h-6 w-6 shrink-0 text-brand-dark" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-slate-900">{location.name}</p>
          <p className="text-sm text-slate-700">{facts.join(" · ")}</p>
        </div>
        {mode === "view" && open && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMode("edit")}>
              {t("common.edit")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                close.reset();
                setMode("confirmClose");
              }}
            >
              {t("locations.close")}
            </Button>
          </div>
        )}
        {!open && (
          <Button
            size="sm"
            variant="secondary"
            disabled={reopen.isPending}
            onClick={() => reopen.mutate(location.id)}
          >
            {t("locations.reopen")}
          </Button>
        )}
      </div>
      {mode === "edit" && <LocationForm location={location} onDone={() => setMode("view")} />}
      {mode === "confirmClose" && (
        <ConfirmPanel
          danger
          message={t("locations.closeConfirm", { name: location.name })}
          confirmLabel={t("locations.close")}
          busy={close.isPending}
          onCancel={() => setMode("view")}
          onConfirm={() => close.mutate(location.id, { onSuccess: () => setMode("view") })}
        />
      )}
      <CloseLocationError error={close.error} />
      <FormError error={reopen.error} />
    </li>
  );
}
