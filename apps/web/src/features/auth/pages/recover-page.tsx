import { recoverRequestSchema } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError } from "../components/form-error";
import { PasswordChecklist } from "../components/password-checklist";
import { PasswordInput } from "../components/password-input";
import { useRecover } from "../hooks/use-auth-mutations";
import { useFieldErrors } from "../hooks/use-field-errors";
import { passwordProblemKey } from "../validation";

/** Forgotten password: phone/email + one saved recovery code + a new password. */
export function RecoverPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const recover = useRecover();
  const [identifier, setIdentifier] = useState("");
  const [recoveryCode, setCode] = useState("");
  const [newPassword, setNew] = useState("");
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = recoverRequestSchema.safeParse({ identifier, recoveryCode, newPassword });
    if (!parsed.success) {
      return showIssues(parsed.error.issues, { newPassword: passwordProblemKey(newPassword) });
    }
    clear();
    recover.mutate(parsed.data, {
      onSuccess: () => navigate("/login", { replace: true, state: { recovered: true } }),
    });
  };

  return (
    <AppShell>
      <Card>
        <CardTitle>{t("recover.title")}</CardTitle>
        <CardDescription>{t("recover.intro")}</CardDescription>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <FormField label={t("recover.identifier")} error={fieldError("identifier")}>
            {(a11y) => (
              <Input
                {...a11y}
                autoComplete="username"
                inputMode="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            )}
          </FormField>
          <FormField label={t("recover.code")} error={fieldError("recoveryCode")}>
            {(a11y) => (
              <Input
                {...a11y}
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono tracking-wider"
                value={recoveryCode}
                onChange={(e) => setCode(e.target.value)}
              />
            )}
          </FormField>
          <FormField label={t("recover.newPassword")} error={fieldError("newPassword")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
              />
            )}
          </FormField>
          <PasswordChecklist password={newPassword} />
          <FormError error={recover.error} />
          <Button type="submit" block disabled={recover.isPending}>
            {recover.isPending ? t("common.working") : t("recover.submit")}
          </Button>
        </form>
        <Link className="mt-5 inline-block font-semibold text-brand-dark underline" to="/login">
          {t("recover.backToLogin")}
        </Link>
      </Card>
    </AppShell>
  );
}
