import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import i18n, { initI18n } from "@/i18n";

/**
 * Node 25 has its own experimental global `localStorage` that hides jsdom's and does not work
 * without a file path, so every test gets a simple in-memory Storage instead.
 */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}

function installStorage() {
  const storage = new MemoryStorage();
  for (const target of [globalThis, window]) {
    Object.defineProperty(target, "localStorage", { value: storage, configurable: true });
  }
}

installStorage();
// Full-page flows load several API calls in a row; slow shared machines need more than 1s.
configure({ asyncUtilTimeout: 5000 });
initI18n("en");

beforeEach(async () => {
  installStorage();
  await i18n.changeLanguage("en");
});

afterEach(() => {
  cleanup();
});
