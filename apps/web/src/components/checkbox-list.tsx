import { useId } from "react";

export interface CheckboxOption {
  value: string;
  label: string;
}

interface CheckboxListProps {
  legend: string;
  options: CheckboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Already-translated error text. */
  error?: string | undefined;
}

/** Pick one or several items, e.g. which locations a person or a Till belongs to. */
export function CheckboxList({ legend, options, selected, onChange, error }: CheckboxListProps) {
  const errorId = useId();
  const toggle = (value: string, on: boolean) =>
    onChange(on ? [...selected, value] : selected.filter((v) => v !== value));
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={Boolean(error)}>
      <legend className="mb-1 text-base font-semibold text-slate-900">{legend}</legend>
      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-tap cursor-pointer items-center gap-3 text-base"
          >
            <input
              type="checkbox"
              className="h-6 w-6 accent-brand"
              checked={selected.includes(option.value)}
              onChange={(e) => toggle(option.value, e.target.checked)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </fieldset>
  );
}
