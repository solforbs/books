import { changePasswordRequestSchema } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FormError } from "../components/form-error";
import { LogoutButton } from "../components/logout-button";
import { PasswordChecklist } from "../components/password-checklist";
import { PasswordInput } from "../components/password-input";
import { useChangePassword } from "../hooks/use-auth-mutations";
import { useFieldErrors } from "../hooks/use-field-errors";
import { useSession } from "../hooks/use-session";
import { passwordProblemKey } from "../validation";

/** Staff created with a temporary password must choose their own before anything else. */
export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userName = useSession().data?.user.name ?? "";
  const change = useChangePassword();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = changePasswordRequestSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      return showIssues(parsed.error.issues, {
        newPassword: passwordProblemKey(newPassword, [userName]),
      });
    }
    clear();
    change.mutate(parsed.data, { onSuccess: () => navigate("/", { replace: true }) });
  };

  return (
    <AppShell actions={<LogoutButton />}>
      <Card>
        <CardTitle>{t("changePassword.title")}</CardTitle>
        <CardDescription>{t("changePassword.intro")}</CardDescription>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <FormField label={t("changePassword.current")} error={fieldError("currentPassword")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
            )}
          </FormField>
          <FormField label={t("changePassword.new")} error={fieldError("newPassword")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
              />
            )}
          </FormField>
          <PasswordChecklist password={newPassword} personalWords={[userName]} />
          <FormError error={change.error} />
          <Button type="submit" block disabled={change.isPending}>
            {change.isPending ? t("common.working") : t("changePassword.submit")}
          </Button>
        </form>
      </Card>
    </AppShell>
  );
}
