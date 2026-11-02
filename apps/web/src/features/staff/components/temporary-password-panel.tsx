import { Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * The server shows a temporary password only once. It lives in this panel's props only: it is
 * never stored, and it is gone as soon as the person leaves the screen.
 */
export function TemporaryPasswordPanel({ name, password }: { name: string; password: string }) {
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section
      aria-labelledby="temp-password-title"
      className="rounded-xl border-2 border-brand bg-brand-light/40 p-5"
    >
      <h2
        id="temp-password-title"
        className="flex items-center gap-2 font-heading text-xl font-bold text-slate-900"
      >
        <KeyRound aria-hidden className="h-6 w-6 text-brand-dark" />
        {t("staff.tempPassword.title", { name })}
      </h2>
      <p
        className="mt-3 select-all rounded-lg bg-white p-3 text-center font-mono text-2xl tracking-wider"
        data-testid="temporary-password"
      >
        {password}
      </p>
      <p className="mt-3 text-base text-slate-800">{t("staff.tempPassword.explain")}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{t("staff.tempPassword.once")}</p>
      <Button variant="secondary" className="mt-3" onClick={() => void copy()}>
        <Copy aria-hidden className="h-5 w-5" />
        {t("staff.tempPassword.copy")}
      </Button>
      {copyState === "copied" && (
        <Alert variant="success" className="mt-3">
          {t("staff.tempPassword.copied")}
        </Alert>
      )}
      {copyState === "failed" && (
        <Alert variant="error" className="mt-3">
          {t("staff.tempPassword.copyFailed")}
        </Alert>
      )}
    </section>
  );
}
