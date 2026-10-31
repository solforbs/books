import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toFieldErrors, type FieldErrors } from "../validation";

type Issues = Parameters<typeof toFieldErrors>[0];

/** Per-field validation messages for a form, already translated for display. */
export function useFieldErrors() {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<FieldErrors>({});

  const fieldError = useCallback(
    (name: string): string | undefined => {
      const key = errors[name];
      return key ? t(key) : undefined;
    },
    [errors, t],
  );

  const showIssues = useCallback(
    (issues: Issues, passwordKeys?: FieldErrors) => setErrors(toFieldErrors(issues, passwordKeys)),
    [],
  );
  const clear = useCallback(() => setErrors({}), []);

  return { fieldError, showIssues, clear };
}
