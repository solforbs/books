import { LANGUAGES, type Language } from "@books/shared";

const STORAGE_KEY = "books.language";

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/** Storage can throw (private mode, blocked site data), so the choice is best-effort. */
export function loadLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

export function saveLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not fatal: the language simply resets to English on the next visit.
  }
}
