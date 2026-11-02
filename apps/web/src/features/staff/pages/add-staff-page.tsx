import type { CreateStaffResponse } from "@books/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { AddStaffForm } from "../components/add-staff-form";
import { TemporaryPasswordPanel } from "../components/temporary-password-panel";

/**
 * Settings -> Staff -> Add. After saving, a new person's temporary password is shown once;
 * someone who already has an account (e.g. from another business) keeps their own password.
 * The result lives only in this page's state, so leaving the page forgets it.
 */
export function AddStaffPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [result, setResult] = useState<CreateStaffResponse | null>(null);

  return (
    <SettingsPage title={t("staff.addTitle")} backTo="/settings/staff">
      {result ? (
        <>
          {result.temporaryPassword ? (
            <TemporaryPasswordPanel name={result.member.name} password={result.temporaryPassword} />
          ) : (
            <Alert variant="success">{t("staff.existingUser", { name: result.member.name })}</Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/settings/staff")}>{t("common.done")}</Button>
            <Button variant="secondary" onClick={() => setResult(null)}>
              {t("staff.addAnother")}
            </Button>
          </div>
        </>
      ) : (
        <Card className="sm:p-6">
          <AddStaffForm onCreated={setResult} />
        </Card>
      )}
    </SettingsPage>
  );
}
