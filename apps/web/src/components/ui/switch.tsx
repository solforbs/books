import { cn } from "@/lib/utils";

interface SwitchProps {
  label: string;
  /** Short explanation under the label. */
  description?: string | undefined;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** An on/off setting. A real checkbox with role="switch", so it works with every screen reader. */
export function Switch({ label, description, checked, onChange, disabled }: SwitchProps) {
  return (
    <label className="flex min-h-tap cursor-pointer items-start justify-between gap-4 py-1">
      <span>
        <span className="block text-base font-semibold text-slate-900">{label}</span>
        {description && <span className="block text-sm text-slate-700">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        className={cn(
          "relative mt-1 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-400",
          "transition-colors checked:bg-brand focus-visible:outline-none focus-visible:ring-4",
          "focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60",
          "before:absolute before:left-1 before:top-1 before:h-5 before:w-5 before:rounded-full",
          "before:bg-white before:transition-transform checked:before:translate-x-5",
        )}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
