import type { ApproveSupplierRequest, Supplier } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/features/staff/format";
import { useApproveSupplier } from "../hooks/use-supplier-mutations";
import { buildApprove, valuesFromSupplier } from "../supplier-form-values";
import { SupplierForm } from "./supplier-form";

/**
 * One supplier added by name only. The phone is required to complete it; anything else can be
 * fixed in the same step.
 */
export function WaitingSupplierItem({ supplier }: { supplier: Supplier }) {
  const { t, i18n } = useTranslation();
  const approve = useApproveSupplier();
  const [open, setOpen] = useState(false);

  return (
    <Card className="flex flex-col gap-3 sm:p-5">
      <div>
        <h2 className="break-words font-heading text-xl font-bold">{supplier.name}</h2>
        <p className="text-sm text-slate-700">
          {t("suppliers.waiting.addedBy", {
            name: supplier.addedBy.name,
            when: formatDateTime(supplier.createdAt, i18n.language),
          })}
        </p>
      </div>
      {open ? (
        <SupplierForm<ApproveSupplierRequest>
          initial={valuesFromSupplier(supplier, true)}
          submitLabel={t("suppliers.waiting.save")}
          anywayLabel={t("suppliers.waiting.saveAnyway")}
          build={(values) => buildApprove(values, supplier)}
          save={async (body, acknowledge) =>
            (
              await approve.mutateAsync({
                id: supplier.id,
                body: acknowledge ? { ...body, acknowledgeSimilar: true } : body,
              })
            ).supplier
          }
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <Button className="w-fit" onClick={() => setOpen(true)}>
          {t("suppliers.waiting.complete")}
        </Button>
      )}
    </Card>
  );
}
