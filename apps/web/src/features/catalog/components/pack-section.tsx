import type { Product } from "@books/shared";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import { useAddPack, useRetirePack } from "../hooks/use-product-mutations";

/**
 * Pack units (box, carton) of a quantity-only product. A pack's size is never edited: retire
 * it and add a new one, so old records stay correct (F01 §10). Not offered for IMEI/serial.
 */
export function PackSection({ product, canManage }: { product: Product; canManage: boolean }) {
  const { t } = useTranslation();
  const add = useAddPack();
  const retire = useRetirePack();
  const [name, setName] = useState("");
  const [size, setSize] = useState("");
  const [retiring, setRetiring] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const active = product.packUnits.filter((p) => p.active);
  if (product.trackingType !== "quantity") return null;
  if (active.length === 0 && !canManage) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const count = Number(size);
    if (!name.trim() || !Number.isInteger(count) || count < 2) return setInvalid(true);
    setInvalid(false);
    add.mutate(
      { id: product.id, body: { name: name.trim(), size: count } },
      {
        onSuccess: () => {
          setName("");
          setSize("");
        },
      },
    );
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold">{t("catalog.packs.title")}</h2>
      {active.length === 0 ? (
        <p className="text-slate-700">{t("catalog.packs.none")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {active.map((pack) => (
            <li key={pack.id} className="flex flex-col gap-2 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {t("catalog.packs.line", {
                    name: pack.name,
                    size: pack.size,
                    unit: product.baseUnit,
                  })}
                </span>
                {canManage && retiring !== pack.id && (
                  <Button variant="ghost" size="sm" onClick={() => setRetiring(pack.id)}>
                    {t("catalog.packs.retire")}
                  </Button>
                )}
              </div>
              {retiring === pack.id && (
                <ConfirmPanel
                  danger
                  message={t("catalog.packs.retireConfirm", { name: pack.name })}
                  confirmLabel={t("catalog.packs.retire")}
                  busy={retire.isPending}
                  onCancel={() => setRetiring(null)}
                  onConfirm={() =>
                    retire.mutate(
                      { id: product.id, packId: pack.id },
                      { onSuccess: () => setRetiring(null) },
                    )
                  }
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form
          className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end"
          onSubmit={submit}
          noValidate
        >
          <FormField label={t("catalog.packs.name")}>
            {(a11y) => (
              <Input
                {...a11y}
                placeholder={t("catalog.packs.nameHint")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </FormField>
          <FormField
            label={t("catalog.packs.size")}
            error={invalid ? t("catalog.packs.sizeError") : undefined}
          >
            {(a11y) => (
              <Input
                {...a11y}
                inputMode="numeric"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            )}
          </FormField>
          <Button type="submit" variant="secondary" disabled={add.isPending}>
            <Plus aria-hidden className="h-5 w-5" />
            {t("catalog.packs.add")}
          </Button>
        </form>
      )}
      <FormError error={add.error ?? retire.error} />
    </section>
  );
}
