import { useId, type ReactNode } from "react";
import { Label } from "./ui/label";

export interface FieldA11yProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
}

interface FormFieldProps {
  label: string;
  hint?: string;
  /** Already-translated error text. */
  error?: string | undefined;
  /** Renders the control; spread the given props onto it so label, hint and error are linked. */
  children: (props: FieldA11yProps) => ReactNode;
}

export function FormField({ label, hint, error, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-slate-700">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
