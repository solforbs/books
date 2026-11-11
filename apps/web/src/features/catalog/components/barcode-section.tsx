import { normalizeBarcode, type Product } from "@books/shared";
import { Plus, ScanBarcode } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPanel } from "@/components/confirm-panel";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import {
  useAddBarcode,
  useGenerateBarcode,
  useRetireBarcode,
} from "../hooks/use-product-mutations";

interface BarcodeSectionProps {
  product: Product;
  /** May add and retire barcodes. */
  canManage: boolean;
  /** May make a shop barcode (managers, or the person who added this waiting product). */
  canGenerate: boolean;
}

/** Barcodes of the product: add one, make a shop barcode (shown big), retire one. */
export function BarcodeSection({ product, canManage, canGenerate }: BarcodeSectionProps) {
  const { t } = useTranslation();
  const add = useAddBarcode();
  const generate = useGenerateBarcode();
  const retire = useRetireBarcode();
  const [text, setText] = useState("");
  const [retiring, setRetiring] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const active = product.barcodes.filter((b) => b.active);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = normalizeBarcode(text);
    if (!value) return;
    add.mutate({ id: product.id, value }, { onSuccess: () => setText("") });
  };

  const makeShopBarcode = () =>
    generate.mutate(product.id, {
      onSuccess: ({ product: updated }) => {
        const known = new Set(product.barcodes.map((b) => b.id));
        setFresh(
          updated.barcodes.find((b) => b.kind === "shop" && !known.has(b.id))?.value ?? null,
        );
      },
    });

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold">{t("catalog.barcodes.title")}</h2>
      {fresh && (
        <div role="status" className="rounded-lg border-2 border-brand bg-brand-light p-4">
          <p className="font-semibold text-brand-dark">{t("catalog.barcodes.newShopCode")}</p>
          <p
            data-testid="new-barcode"
            className="mt-1 break-all font-heading text-3xl font-bold tracking-wider"
          >
            {fresh}
          </p>
        </div>
      )}
      {active.length === 0 ? (
        <p className="text-slate-700">{t("catalog.barcodes.none")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {active.map((b) => (
            <li key={b.id} className="flex flex-col gap-2 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-semibold">{b.value}</span>{" "}
                  <span className="text-sm text-slate-700">
                    {t(`catalog.barcodes.kind.${b.kind}`)}
                  </span>
                </span>
                {canManage && retiring !== b.id && (
                  <Button variant="ghost" size="sm" onClick={() => setRetiring(b.id)}>
                    {t("catalog.barcodes.retire")}
                  </Button>
                )}
              </div>
              {retiring === b.id && (
                <ConfirmPanel
                  danger
                  message={t("catalog.barcodes.retireConfirm", { code: b.value })}
                  confirmLabel={t("catalog.barcodes.retire")}
                  busy={retire.isPending}
                  onCancel={() => setRetiring(null)}
                  onConfirm={() =>
                    retire.mutate(
                      { id: product.id, barcodeId: b.id },
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
        <form className="flex items-end gap-2" onSubmit={submit} noValidate>
          <div className="flex-1">
            <FormField label={t("catalog.barcodes.add")}>
              {(a11y) => (
                <Input
                  {...a11y}
                  autoComplete="off"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              )}
            </FormField>
          </div>
          <Button type="submit" variant="secondary" disabled={add.isPending}>
            <Plus aria-hidden className="h-5 w-5" />
            {t("catalog.chips.add")}
          </Button>
        </form>
      )}
      {canGenerate && (
        <Button
          variant="secondary"
          className="w-fit"
          disabled={generate.isPending}
          onClick={makeShopBarcode}
        >
          <ScanBarcode aria-hidden className="h-5 w-5" />
          {t("catalog.barcodes.generate")}
        </Button>
      )}
      <FormError error={add.error ?? generate.error ?? retire.error} />
    </section>
  );
}
