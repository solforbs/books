import { describe, expect, it } from "vitest";
import {
  checkPassword,
  formatShillings,
  isValidImei,
  normalizeKenyanPhone,
  parseShillings,
  registerRequestSchema,
} from "../index";

describe("money", () => {
  it("parses typed shillings into cents", () => {
    expect(parseShillings("1,250.50")).toBe(125050);
    expect(parseShillings("95000")).toBe(9500000);
    expect(() => parseShillings("12.345")).toThrow();
  });
  it("formats cents for display", () => {
    expect(formatShillings(parseShillings("1250.5"))).toBe("1,250.50");
  });
});

describe("imei", () => {
  it("accepts a valid IMEI and rejects a wrong check digit (F04 §4.3)", () => {
    expect(isValidImei("490154203237518")).toBe(true);
    expect(isValidImei("490154203237519")).toBe(false);
    expect(isValidImei("49015420323751")).toBe(false);
    expect(isValidImei("4901-5420 3237518")).toBe(true);
  });
});

describe("phone", () => {
  it("normalises Kenyan numbers to +254", () => {
    expect(normalizeKenyanPhone("0712 345 678")).toBe("+254712345678");
    expect(normalizeKenyanPhone("+254 712 345 678")).toBe("+254712345678");
    expect(normalizeKenyanPhone("0110345678")).toBe("+254110345678");
    expect(normalizeKenyanPhone("12345")).toBeNull();
  });
});

describe("password policy", () => {
  it("requires length, variety and not common", () => {
    expect(checkPassword("short1A")).toContain("too_short");
    expect(checkPassword("alllowercaseletters")).toContain("too_simple");
    expect(checkPassword("Duka-Mpya-77x")).toEqual([]);
    // Capitalising a common password does not make it safe.
    expect(checkPassword("Password123")).toContain("too_common");
    expect(checkPassword("Amina-Shop-2026", ["Amina"])).toContain("too_common");
  });
});

describe("register contract", () => {
  it("requires phone or email", () => {
    const r = registerRequestSchema.safeParse({
      businessName: "Luthuli Phones",
      ownerName: "Amina",
      password: "Strong-Pass-2026",
    });
    expect(r.success).toBe(false);
  });
  it("normalises the phone number", () => {
    const r = registerRequestSchema.parse({
      businessName: "Luthuli Phones",
      ownerName: "Amina",
      phone: "0712345678",
      password: "Strong-Pass-2026",
    });
    expect(r.phone).toBe("+254712345678");
  });
});
