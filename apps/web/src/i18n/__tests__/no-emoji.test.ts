import { describe, expect, it } from "vitest";
import { pwaManifest } from "../../../pwa-manifest";
import { en } from "../en";
import { so } from "../so";

// Founder rule: no emojis anywhere in the UI. Visual cues use lucide-react icons or plain text.
const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{20E3}]/u;

function strings(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe("no emojis", () => {
  it("in the English and Somali texts", () => {
    for (const [key, text] of [...strings(en, "en"), ...strings(so, "so")]) {
      expect(EMOJI.test(text), `${key}: ${text}`).toBe(false);
    }
  });

  it("in the app manifest", () => {
    expect(EMOJI.test(JSON.stringify(pwaManifest))).toBe(false);
  });

  it("in any source file", () => {
    const sources = import.meta.glob<string>(["/src/**/*.{ts,tsx,css}", "/index.html"], {
      query: "?raw",
      import: "default",
      eager: true,
    });
    expect(Object.keys(sources).length).toBeGreaterThan(10);
    for (const [file, text] of Object.entries(sources)) {
      expect(EMOJI.test(text), file).toBe(false);
    }
  });
});
