import type { Supplier } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError } from "@/features/auth/components/form-error";
import { useQuickSupplier } from "../hooks/use-supplier-mutations";
import { useSupplierSave } from "../hooks/use-supplier-save";
import { SupplierBlockPanel } from "./supplier-block-panel";

interface Props {
  onSaved: (supplier: Supplier) => void;
  onCancel?: () => void;
}

/**
 * "Add a supplier by name" for people who receive stock but cannot manage suppliers (F03
 * §9.10). Name only: the owner or a manager completes the details later. The Receiving screen
 * reuses this component.
 */
export function QuickSupplierForm({ onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const quick = useQuickSupplier();
  const [name, setName] = useState("");
  const [tooShort, setTooShort] = useState(false);
  const flow = useSupplierSave<string>({
    save: async (supplierName, acknowledgeSimilar) =>
      (
        await quick.mutateAsync({
          name: supplierName,
          ...(acknowledgeSimilar ? { acknowledgeSimilar: true } : {}),
        })
      ).supplier,
    onSaved,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    setTooShort(clean.length < 2);
    if (clean.length >= 2) void flow.submit(clean);
  };

  return (
    <Card className="sm:p-5">
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-bold text-slate-900">
          {t("suppliers.quick.title")}
        </h2>
        <FormField
          label={t("suppliers.form.name")}
          hint={t("suppliers.quick.hint")}
          error={tooShort ? t("validation.name_too_short") : undefined}
        >
          {(a11y) => (
            <Input
              {...a11y}
              autoComplete="off"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                flow.dismiss();
              }}
            />
          )}
        </FormField>
        {flow.block && (
          <SupplierBlockPanel
            block={flow.block}
            busy={flow.pending}
            onCreateAnyway={flow.createAnyway}
            onDismiss={flow.dismiss}
          />
        )}
        <FormError error={flow.error} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={flow.pending}>
            {flow.pending ? t("common.working") : t("suppliers.quick.submit")}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
