import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cleanText } from "@books/shared";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { SuggestInput } from "./suggest-input";

interface ChipInputProps {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  error?: string | undefined;
  /** How typed text is cleaned before it becomes a chip (default: tidy spaces). */
  normalize?: (text: string) => string;
}

/** Type a value, press Enter or Add, and it becomes a chip. Used for storages, colours, conditions. */
export function ChipInput({
  label,
  hint,
  values,
  onChange,
  suggestions,
  error,
  normalize = cleanText,
}: ChipInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const add = () => {
    const value = normalize(text);
    setText("");
    if (!value) return;
    const exists = values.some((v) => v.toLowerCase() === value.toLowerCase());
    if (!exists) onChange([...values, value]);
  };

  return (
    <div>
      <FormField label={label} hint={hint} error={error}>
        {(a11y) => (
          <div className="flex gap-2">
            <SuggestInput
              {...a11y}
              options={suggestions.filter((s) => !values.includes(s))}
              value={text}
              onChange={(e) => setText(e.target.value)}
              // Typed but not added yet: keep it when the person moves on (e.g. taps Save).
              onBlur={add}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <Button variant="secondary" onClick={add}>
              {t("catalog.chips.add")}
            </Button>
          </div>
        )}
      </FormField>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={t("catalog.chips.chosen", { label })}>
          {values.map((value) => (
            <li
              key={value}
              className="flex min-h-10 items-center gap-1 rounded-full bg-brand-light pl-3 pr-1 font-semibold text-brand-dark"
            >
              {value}
              <button
                type="button"
                aria-label={t("catalog.chips.remove", { value })}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
