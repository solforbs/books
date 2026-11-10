import { useTranslation } from "react-i18next";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";

interface MoneyFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string;
}

/** A price typed in shillings (for example 1,200 or 1,200.50); the form turns it into cents. */
export function MoneyField({ label, value, onChange, error, hint }: MoneyFieldProps) {
  const { t } = useTranslation();
  return (
    <FormField label={label} error={error} hint={hint}>
      {(a11y) => (
        <div className="flex items-center gap-2">
          <span aria-hidden className="font-semibold text-slate-700">
            {t("catalog.currency")}
          </span>
          <Input
            {...a11y}
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </FormField>
  );
}
