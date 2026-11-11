import {
  AUTH_ERROR_CODES,
  BARCODE_KINDS,
  CATEGORY_ERROR_CODES,
  LANGUAGES,
  LOCATION_ERROR_CODES,
  MONEY_PLACE_TYPES,
  NAMING_MODES,
  PAYMENT_RULE_TYPES,
  PERMISSIONS,
  PRODUCT_ERROR_CODES,
  ROLES,
  STAFF_ERROR_CODES,
  SUPPLIER_ERROR_CODES,
  TIME_UNITS,
  TRACKING_TYPES,
  VAT_TYPES,
  type PasswordProblem,
} from "@books/shared";
import { describe, expect, it } from "vitest";
import { CLIENT_ERROR_CODES } from "@/lib/api";
import { en } from "../en";
import { so } from "../so";

function flatten(obj: object, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[path] = value;
    else Object.assign(out, flatten(value as object, path));
  }
  return out;
}

const enKeys = flatten(en);
const soKeys = flatten(so);

describe("translations", () => {
  it("Somali has exactly the same keys as English", () => {
    expect(Object.keys(soKeys).sort()).toEqual(Object.keys(enKeys).sort());
  });

  it("has no empty texts", () => {
    for (const [key, value] of [...Object.entries(enKeys), ...Object.entries(soKeys)]) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keeps the same {{placeholders}} in both languages", () => {
    const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
    for (const [key, value] of Object.entries(enKeys)) {
      expect(placeholders(soKeys[key] ?? ""), key).toEqual(placeholders(value));
    }
  });

  it("translates every API error code, password problem, role, language and permission", () => {
    const problems: PasswordProblem[] = ["too_short", "too_long", "too_simple", "too_common"];
    const required = [
      ...AUTH_ERROR_CODES.map((c) => `errors.${c}`),
      ...LOCATION_ERROR_CODES.map((c) => `errors.${c}`),
      ...STAFF_ERROR_CODES.map((c) => `errors.${c}`),
      ...PERMISSIONS.map((p) => `permission.${p}`),
      ...MONEY_PLACE_TYPES.map((m) => `moneyPlaces.types.${m}`),
      ...ROLES.map((r) => `staff.roleHint.${r}`),
      ...CLIENT_ERROR_CODES.map((c) => `errors.${c}`),
      ...problems.map((p) => `passwordProblem.${p}`),
      ...PRODUCT_ERROR_CODES.map((c) => `errors.${c}`),
      ...CATEGORY_ERROR_CODES.map((c) => `errors.${c}`),
      ...TRACKING_TYPES.map((v) => `catalog.tracking.${v}`),
      ...NAMING_MODES.map((v) => `catalog.naming.${v}`),
      ...VAT_TYPES.map((v) => `catalog.vat.${v}`),
      ...BARCODE_KINDS.map((v) => `catalog.barcodes.kind.${v}`),
      ...["waiting", "hidden", "merged", "rejected"].map((v) => `catalog.status.${v}`),
      ...SUPPLIER_ERROR_CODES.map((c) => `errors.${c}`),
      ...PAYMENT_RULE_TYPES.flatMap((r) => [
        `suppliers.rule.choice.${r}`,
        `suppliers.rule.short.${r}`,
        `suppliers.rule.sentence.${r}`,
      ]),
      ...TIME_UNITS.flatMap((u) => [`suppliers.unitName.${u}`, `suppliers.units.${u}_other`]),
      ...["waiting", "hidden"].map((v) => `suppliers.status.${v}`),
      ...ROLES.map((r) => `role.${r}`),
      ...LANGUAGES.map((l) => `language.${l}`),
    ];
    for (const key of required) {
      expect(enKeys[key], key).toBeTruthy();
      expect(soKeys[key], key).toBeTruthy();
    }
  });

  it("has every text key the catalog and suppliers screens ask for, in both languages", () => {
    const sources = import.meta.glob<string>("/src/features/{catalog,suppliers}/**/*.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    });
    const used = new Set<string>();
    for (const [file, text] of Object.entries(sources)) {
      if (file.includes("__tests__")) continue;
      for (const match of text.matchAll(/(?<![\w.])t\(\s*["'`]([\w.]+)["'`]/g))
        used.add(match[1] ?? "");
    }
    expect(used.size).toBeGreaterThan(50);
    for (const key of used) {
      // Counted texts are stored as key_one / key_other.
      const known = (keys: Record<string, string>) => key in keys || `${key}_other` in keys;
      expect(known(enKeys), `en: ${key}`).toBe(true);
      expect(known(soKeys), `so: ${key}`).toBe(true);
    }
  });
});
