import type { Language } from "@books/shared";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./en";
import { loadLanguage, saveLanguage } from "./language-storage";
import { so } from "./so";

export const resources = {
  en: { translation: en },
  so: { translation: so },
} as const;

export function initI18n(language: Language = loadLanguage()) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: "en",
      interpolation: { escapeValue: false }, // React already escapes output.
    });
    document.documentElement.lang = language;
  }
  return i18n;
}

export async function changeLanguage(language: Language): Promise<void> {
  saveLanguage(language);
  document.documentElement.lang = language;
  await i18n.changeLanguage(language);
}

export default i18n;
