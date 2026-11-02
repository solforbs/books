import { useTranslation } from "react-i18next";
import { FormError } from "@/features/auth/components/form-error";
import { Button } from "./ui/button";

export function LoadingText() {
  const { t } = useTranslation();
  return (
    <p role="status" className="p-6 text-center text-lg text-slate-700">
      {t("app.loading")}
    </p>
  );
}

/** A failed load: one clear message and a Try again button. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <FormError error={error} />
      <Button onClick={onRetry}>{t("common.retry")}</Button>
    </div>
  );
}
