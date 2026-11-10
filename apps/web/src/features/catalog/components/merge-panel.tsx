import type { Product } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import { useDebounced } from "../hooks/use-debounced";
import { useMergeProduct } from "../hooks/use-product-mutations";
import { useProductSearch } from "../hooks/use-products";

interface MergePanelProps {
  product: Product;
  onCancel: () => void;
}

/**
 * "Same as an existing product": search, pick the target, then a clear confirmation of what
 * moves and that it cannot be undone (F01 §13.4).
 */
export function MergePanel({ product, onCancel }: MergePanelProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Product | null>(null);
  const merge = useMergeProduct();
  const results = useProductSearch(useDebounced(text.trim()));
  const choices = (results.data ?? []).filter((p) => p.id !== product.id && p.status === "active");

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-slate-300 bg-slate-50 p-4">
      {target ? (
        <ConfirmPanel
          danger
          message={t("catalog.merge.confirm", { from: product.name, into: target.name })}
          confirmLabel={t("catalog.merge.confirmButton")}
          busy={merge.isPending}
          onCancel={() => setTarget(null)}
          onConfirm={() => merge.mutate({ id: product.id, intoId: target.id })}
        />
      ) : (
        <>
          <FormField label={t("catalog.merge.search")} hint={t("catalog.merge.hint")}>
            {(a11y) => (
              <Input
                {...a11y}
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}
          </FormField>
          {results.data && choices.length === 0 && (
            <p className="text-slate-700">{t("catalog.merge.noResults")}</p>
          )}
          <ul className="flex flex-col">
            {choices.map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  className="flex min-h-tap w-full items-center rounded-lg px-3 text-left font-semibold text-brand-dark hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                  onClick={() => setTarget(choice)}
                >
                  {choice.name}
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" className="w-fit" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </>
      )}
      <FormError error={merge.error} />
    </div>
  );
}
