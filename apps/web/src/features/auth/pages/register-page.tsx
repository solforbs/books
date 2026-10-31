import { registerRequestSchema, type RegisterResponse } from "@books/shared";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isLanguage } from "@/i18n/language-storage";
import { FormError } from "../components/form-error";
import { PasswordChecklist } from "../components/password-checklist";
import { PasswordInput } from "../components/password-input";
import { RecoveryCodes } from "../components/recovery-codes";
import { useRegister } from "../hooks/use-auth-mutations";
import { useFieldErrors } from "../hooks/use-field-errors";
import { useSetSession } from "../hooks/use-session";
import { blankToUndefined, passwordProblemKey } from "../validation";

const EMPTY = { businessName: "", ownerName: "", phone: "", email: "", password: "" };

/** Owner sign-up (F02 §2.1 with password login). Ends on the "save your recovery codes" step. */
export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const register = useRegister();
  const setSession = useSetSession();
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState<RegisterResponse | null>(null);
  const { fieldError, showIssues, clear } = useFieldErrors();

  const set = (name: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = registerRequestSchema.safeParse({
      businessName: form.businessName,
      ownerName: form.ownerName,
      phone: blankToUndefined(form.phone),
      email: blankToUndefined(form.email),
      password: form.password,
      language: isLanguage(i18n.language) ? i18n.language : "en",
    });
    if (!parsed.success) {
      const words = [form.ownerName, form.businessName];
      return showIssues(parsed.error.issues, {
        password: passwordProblemKey(form.password, words),
      });
    }
    clear();
    register.mutate(parsed.data, { onSuccess: setCreated });
  };

  if (created) {
    const { recoveryCodes, ...session } = created;
    return (
      <AppShell>
        <RecoveryCodes
          codes={recoveryCodes}
          onContinue={() => {
            setSession(session);
            navigate("/", { replace: true });
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Card>
        <CardTitle>{t("register.title")}</CardTitle>
        <form className="mt-5 flex flex-col gap-4" onSubmit={submit} noValidate>
          <FormField label={t("register.businessName")} error={fieldError("businessName")}>
            {(a11y) => (
              <Input
                {...a11y}
                autoComplete="organization"
                value={form.businessName}
                onChange={set("businessName")}
              />
            )}
          </FormField>
          <FormField label={t("register.ownerName")} error={fieldError("ownerName")}>
            {(a11y) => (
              <Input
                {...a11y}
                autoComplete="name"
                value={form.ownerName}
                onChange={set("ownerName")}
              />
            )}
          </FormField>
          <CardDescription>{t("register.contactHint")}</CardDescription>
          <FormField label={t("register.phone")} error={fieldError("phone")}>
            {(a11y) => (
              <Input
                {...a11y}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={set("phone")}
              />
            )}
          </FormField>
          <FormField label={t("register.email")} error={fieldError("email")}>
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
              />
            )}
          </FormField>
          <FormField label={t("register.password")} error={fieldError("password")}>
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
              />
            )}
          </FormField>
          <PasswordChecklist
            password={form.password}
            personalWords={[form.ownerName, form.businessName]}
          />
          <FormError error={register.error} />
          <Button type="submit" block disabled={register.isPending}>
            {register.isPending ? t("common.working") : t("register.submit")}
          </Button>
        </form>
        <p className="mt-5 text-base">
          {t("register.haveAccount")}{" "}
          <Link className="font-semibold text-brand-dark underline" to="/login">
            {t("register.loginLink")}
          </Link>
        </p>
      </Card>
    </AppShell>
  );
}
