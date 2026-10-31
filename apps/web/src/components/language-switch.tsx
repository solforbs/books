import { LANGUAGES } from "@books/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/i18n";
import { isLanguage } from "@/i18n/language-storage";
import { cn } from "@/lib/utils";
import { Select } from "./ui/select";

export function LanguageSwitch({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const id = useId();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {t("language.label")}
      </label>
      <Select
        id={id}
        value={i18n.language}
        onChange={(e) => {
          if (isLanguage(e.target.value)) void changeLanguage(e.target.value);
        }}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {t(`language.${lang}`)}
          </option>
        ))}
      </Select>
    </div>
  );
}
