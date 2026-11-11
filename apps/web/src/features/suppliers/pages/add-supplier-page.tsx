import type { CreateSupplierRequest } from "@books/shared";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SupplierForm } from "../components/supplier-form";
import { useCreateSupplier } from "../hooks/use-supplier-mutations";
import { buildCreate, emptySupplierValues } from "../supplier-form-values";

export function AddSupplierPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const create = useCreateSupplier();
  return (
    <SettingsPage title={t("suppliers.add.title")} backTo="/suppliers">
      <SupplierForm<CreateSupplierRequest>
        initial={emptySupplierValues}
        submitLabel={t("common.save")}
        build={buildCreate}
        save={async (body, acknowledge) =>
          (await create.mutateAsync(acknowledge ? { ...body, acknowledgeSimilar: true } : body))
            .supplier
        }
        onSaved={(s) => navigate(`/suppliers/${s.id}`, { replace: true })}
        onCancel={() => navigate("/suppliers")}
      />
    </SettingsPage>
  );
}
