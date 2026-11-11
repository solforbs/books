import type { Product } from "@books/shared";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { useHideProduct, useUnhideProduct } from "../hooks/use-product-mutations";

/**
 * Hide instead of delete (G4). Hiding is refused while stock remains or the product is in use;
 * the API's answer is shown in plain words right here.
 */
export function HideProductPanel({ product }: { product: Product }) {
  const { t } = useTranslation();
  const hide = useHideProduct();
  const unhide = useUnhideProduct();
  const [confirming, setConfirming] = useState(false);

  if (product.status === "hidden") {
    return (
      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="w-fit"
          disabled={unhide.isPending}
          onClick={() => unhide.mutate(product.id)}
        >
          <Eye aria-hidden className="h-5 w-5" />
          {t("catalog.detail.unhide")}
        </Button>
        <FormError error={unhide.error} />
      </div>
    );
  }
  if (product.status === "merged" || product.status === "rejected") return null;

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <ConfirmPanel
          danger
          message={t("catalog.detail.hideConfirm", { name: product.name })}
          confirmLabel={t("catalog.detail.hide")}
          busy={hide.isPending}
          onCancel={() => {
            hide.reset();
            setConfirming(false);
          }}
          onConfirm={() => hide.mutate(product.id, { onSuccess: () => setConfirming(false) })}
        />
      ) : (
        <Button variant="secondary" className="w-fit" onClick={() => setConfirming(true)}>
          <EyeOff aria-hidden className="h-5 w-5" />
          {t("catalog.detail.hide")}
        </Button>
      )}
      <FormError error={hide.error} />
    </div>
  );
}
