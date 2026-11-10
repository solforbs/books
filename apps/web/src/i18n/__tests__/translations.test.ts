import {
  AUTH_ERROR_CODES,
  LANGUAGES,
  LOCATION_ERROR_CODES,
  MONEY_PLACE_TYPES,
  PERMISSIONS,
  ROLES,
  STAFF_ERROR_CODES,
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
      ...ROLES.map((r) => `role.${r}`),
      ...LANGUAGES.map((l) => `language.${l}`),
    ];
    for (const key of required) {
      expect(enKeys[key], key).toBeTruthy();
      expect(soKeys[key], key).toBeTruthy();
    }
  });
});
