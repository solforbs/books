import type { UpdateSupplierRequest } from "@books/shared";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { LoadError, LoadingText } from "@/components/load-state";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SupplierForm } from "../components/supplier-form";
import { useUpdateSupplier } from "../hooks/use-supplier-mutations";
import { useSupplier } from "../hooks/use-suppliers";
import { buildUpdate, valuesFromSupplier } from "../supplier-form-values";

export function EditSupplierPage() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const supplier = useSupplier(id);
  const update = useUpdateSupplier();

  if (supplier.error) {
    return <LoadError error={supplier.error} onRetry={() => void supplier.refetch()} />;
  }
  if (!supplier.data) return <LoadingText />;
  const original = supplier.data;
  const back = `/suppliers/${id}`;

  return (
    <SettingsPage title={t("suppliers.edit.title", { name: original.name })} backTo={back}>
      <SupplierForm<UpdateSupplierRequest>
        initial={valuesFromSupplier(original)}
        submitLabel={t("common.save")}
        note={t("suppliers.detail.ruleNote")}
        build={(values) => buildUpdate(values, original)}
        // Nothing changed: no request, just go back.
        save={async (body, acknowledge) =>
          Object.keys(body).length === 0
            ? original
            : (
                await update.mutateAsync({
                  id,
                  body: acknowledge ? { ...body, acknowledgeSimilar: true } : body,
                })
              ).supplier
        }
        onSaved={() => navigate(back, { replace: true })}
        onCancel={() => navigate(back)}
      />
    </SettingsPage>
  );
}
