import { useId } from "react";
import { cn } from "@/lib/utils";

export interface Choice<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  legend: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Big tap-friendly radio buttons for a choice between a few options (e.g. Shop / Store). */
export function ChoiceGroup<T extends string>({
  legend,
  choices,
  value,
  onChange,
}: ChoiceGroupProps<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-1 text-base font-semibold text-slate-900">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <label
            key={choice.value}
            className={cn(
              "flex min-h-tap cursor-pointer items-center gap-2 rounded-lg border-2 px-4 font-semibold",
              choice.value === value
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-slate-400 bg-white text-slate-900",
            )}
          >
            <input
              type="radio"
              name={name}
              className="h-5 w-5 accent-brand"
              checked={choice.value === value}
              onChange={() => onChange(choice.value)}
            />
            {choice.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
