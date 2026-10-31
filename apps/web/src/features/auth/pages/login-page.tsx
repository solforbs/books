import { loginRequestSchema } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { InstallHint } from "@/components/install-hint";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormError } from "../components/form-error";
import { PasswordInput } from "../components/password-input";
import { useLogin } from "../hooks/use-auth-mutations";
import { useFieldErrors } from "../hooks/use-field-errors";

/** One field for phone or email, one for the password. Route guards handle what comes next. */
export function LoginPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const recovered = (location.state as { recovered?: boolean } | null)?.recovered === true;
  const login = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { fieldError, showIssues, clear } = useFieldErrors();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = loginRequestSchema.safeParse({ identifier, password });
    if (!parsed.success) return showIssues(parsed.error.issues);
    clear();
    login.mutate(parsed.data);
  };

  return (
    <AppShell>
      {recovered && <Alert variant="success">{t("login.recoveredNotice")}</Alert>}
      <Card>
        <CardTitle>{t("login.title")}</CardTitle>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <FormField
            label={t("login.identifier")}
            hint={t("login.identifierHint")}
            error={fieldError("identifier")}
          >
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
          <FormField label={t("login.password")} error={fieldError("password")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </FormField>
          <FormError error={login.error} />
          <Button type="submit" block disabled={login.isPending}>
            {login.isPending ? t("common.working") : t("login.submit")}
          </Button>
        </form>
        <div className="mt-5 flex flex-col gap-2 text-base">
          <Link className="font-semibold text-brand-dark underline" to="/recover">
            {t("login.forgot")}
          </Link>
          <p>
            {t("login.noAccount")}{" "}
            <Link className="font-semibold text-brand-dark underline" to="/register">
              {t("login.registerLink")}
            </Link>
          </p>
        </div>
      </Card>
      <InstallHint />
    </AppShell>
  );
}
