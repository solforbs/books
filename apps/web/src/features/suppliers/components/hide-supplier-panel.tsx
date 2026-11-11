import type { Supplier } from "@books/shared";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useHideSupplier, useUnhideSupplier } from "../hooks/use-supplier-mutations";

/**
 * Hide instead of delete (G4). Hiding is refused while money is still owed; the API's answer
 * (`supplier_has_balance`) is shown in plain words right here.
 */
export function HideSupplierPanel({ supplier }: { supplier: Supplier }) {
  const { t } = useTranslation();
  const hide = useHideSupplier();
  const unhide = useUnhideSupplier();
  const [confirming, setConfirming] = useState(false);

  if (supplier.status === "hidden") {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-fit"
          disabled={unhide.isPending}
          onClick={() => unhide.mutate(supplier.id)}
        >
          <Eye aria-hidden className="h-5 w-5" />
          {t("suppliers.detail.unhide")}
        </Button>
        <FormError error={unhide.error} />
      </div>
    );
  }
  if (supplier.status !== "active") return null;

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <ConfirmPanel
          danger
          message={t("suppliers.detail.hideConfirm", { name: supplier.name })}
          confirmLabel={t("suppliers.detail.hide")}
          busy={hide.isPending}
          onCancel={() => {
            hide.reset();
            setConfirming(false);
          }}
          onConfirm={() => hide.mutate(supplier.id, { onSuccess: () => setConfirming(false) })}
        />
      ) : (
        <Button variant="secondary" className="w-fit" onClick={() => setConfirming(true)}>
          <EyeOff aria-hidden className="h-5 w-5" />
          {t("suppliers.detail.hide")}
        </Button>
      )}
      <FormError error={hide.error} />
    </div>
  );
}
