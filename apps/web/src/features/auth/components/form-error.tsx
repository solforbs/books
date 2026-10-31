import { useTranslation } from "react-i18next";
import { Alert } from "@/components/ui/alert";
import { errorMessageKey } from "@/lib/api";

/** One clear, translated message for a failed request; nothing when there is no error. */
export function FormError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  return <Alert variant="error">{t(errorMessageKey(error))}</Alert>;
}
