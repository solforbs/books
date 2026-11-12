import { describe, expect, it } from "vitest";
import { addPeriod, dueDateFor, kenyaDate } from "../../receiving/domain/due-date";
import { hashCommand, stableStringify } from "../../receiving/domain/request-hash";
import { imei } from "../../receiving/__tests__/receiving-fixtures";
import { splitCost } from "../domain/cost-split";
import { firstDuplicate, prepareUnits } from "../domain/unit-numbers";

const GOOD = imei(1);
const SECOND = imei(2);
const VALID = (n: string) => ({ imei: n });

describe("splitCost: piece costs always add up to the line total", () => {
  it("splits evenly, with the remainder cents on the first pieces", () => {
    expect(splitCost(900_000, 20)).toEqual(Array(20).fill(45_000));
    expect(splitCost(10, 3)).toEqual([4, 3, 3]);
    expect(splitCost(1_000_001, 3)).toEqual([333_334, 333_334, 333_333]);
    expect(splitCost(0, 4)).toEqual([0, 0, 0, 0]);
  });
  it("never loses a cent, for any total and count", () => {
    for (const [total, pieces] of [
      [999, 7],
      [100_000_000_000, 13],
      [1, 5],
      [12345, 1],
    ] as const) {
      const parts = splitCost(total, pieces);
      expect(parts).toHaveLength(pieces);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
    }
  });
  it("refuses a fraction, a negative total and no pieces", () => {
    expect(() => splitCost(1.5, 2)).toThrow();
    expect(() => splitCost(-1, 2)).toThrow();
    expect(() => splitCost(10, 0)).toThrow();
  });
});

describe("prepareUnits: IMEI and serial rules per tracking type (F04 section 4.3)", () => {
  it("accepts a valid IMEI and cleans spaces and dashes", () => {
    expect(
      prepareUnits("imei", [VALID(`${GOOD.slice(0, 2)} ${GOOD.slice(2, 8)}-${GOOD.slice(8)}`)]),
    ).toEqual({
      ok: true,
      units: [{ imei: GOOD, imei2: null, serial: null }],
    });
  });
  it("rejects a wrong check digit, 14 digits and a missing IMEI", () => {
    for (const bad of [
      GOOD.slice(0, 14) + String((Number(GOOD[14]) + 1) % 10),
      GOOD.slice(0, 14),
      "abc",
    ]) {
      expect(prepareUnits("imei", [VALID(bad)])).toMatchObject({ ok: false });
    }
    expect(prepareUnits("imei", [{}])).toMatchObject({
      ok: false,
      problem: { reason: "imei_required" },
    });
  });
  it("a second IMEI must be valid and different; a serial is optional on IMEI goods", () => {
    expect(prepareUnits("imei", [{ imei: GOOD, imei2: GOOD }])).toMatchObject({ ok: false });
    expect(prepareUnits("imei", [{ imei: GOOD, imei2: SECOND, serial: "S1" }])).toEqual({
      ok: true,
      units: [{ imei: GOOD, imei2: SECOND, serial: "S1" }],
    });
  });
  it("quantity goods take no units; serial goods take serials and no IMEI", () => {
    expect(prepareUnits("quantity", [])).toEqual({ ok: true, units: [] });
    expect(prepareUnits("quantity", [VALID(GOOD)])).toMatchObject({
      ok: false,
      problem: { kind: "units_not_allowed" },
    });
    expect(prepareUnits("serial", [{ serial: "SN1" }])).toMatchObject({ ok: true });
    expect(prepareUnits("serial", [{ imei: GOOD, serial: "SN1" }])).toMatchObject({ ok: false });
    expect(prepareUnits("serial", [{}])).toMatchObject({
      ok: false,
      problem: { reason: "serial_required" },
    });
  });
  it("finds a duplicate IMEI across lines and a repeated serial only within one product", () => {
    const a = { imei: GOOD, imei2: null, serial: null };
    expect(
      firstDuplicate([
        { productId: "p1", units: [a] },
        { productId: "p2", units: [a] },
      ]),
    ).toBe(GOOD);
    const s = { imei: null, imei2: null, serial: "SN1" };
    expect(
      firstDuplicate([
        { productId: "p1", units: [s] },
        { productId: "p2", units: [s] },
      ]),
    ).toBeNull();
    expect(firstDuplicate([{ productId: "p1", units: [s, s] }])).toBe("SN1");
  });
});

describe("due dates (Kenya time, no daylight saving)", () => {
  it("uses the Kenya calendar date, which is ahead of UTC after 21:00", () => {
    expect(kenyaDate(new Date("2026-11-12T20:59:00Z"))).toBe("2026-11-12");
    expect(kenyaDate(new Date("2026-11-12T21:00:00Z"))).toBe("2026-11-13");
  });
  it("adds days, weeks and calendar months, clamping a month end", () => {
    expect(addPeriod("2026-11-12", { value: 10, unit: "days" })).toBe("2026-11-22");
    expect(addPeriod("2026-11-12", { value: 2, unit: "weeks" })).toBe("2026-11-26");
    expect(addPeriod("2026-11-12", { value: 1, unit: "months" })).toBe("2026-12-12");
    expect(addPeriod("2026-12-31", { value: 2, unit: "months" })).toBe("2027-02-28");
    expect(addPeriod("2028-01-31", { value: 1, unit: "months" })).toBe("2028-02-29");
    expect(addPeriod("2026-11-12", { value: 14, unit: "months" })).toBe("2028-01-12");
  });
  it("is date based only for cash and within-time rules", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    expect(dueDateFor({ type: "cash" }, now)).toBe("2026-11-12");
    expect(dueDateFor({ type: "within_time", period: { value: 1, unit: "months" } }, now)).toBe(
      "2026-12-12",
    );
    expect(dueDateFor({ type: "pay_as_you_sell" }, now)).toBeNull();
    expect(dueDateFor({ type: "pay_after_all_sold" }, now)).toBeNull();
    expect(
      dueDateFor(
        { type: "after_sold_with_latest_date", period: { value: 1, unit: "months" } },
        now,
      ),
    ).toBeNull();
  });
});

describe("command fingerprint", () => {
  it("ignores key order and the command id, and notices any other change", () => {
    const a = { commandId: "aaaaaaaa", x: 1, y: { b: 2, a: [1, 2] } };
    const b = { y: { a: [1, 2], b: 2 }, commandId: "bbbbbbbb", x: 1 };
    expect(hashCommand("create", null, a)).toBe(hashCommand("create", null, b));
    expect(hashCommand("create", null, a)).not.toBe(hashCommand("costs", null, a));
    expect(hashCommand("costs", "d1", a)).not.toBe(hashCommand("costs", "d2", a));
    expect(hashCommand("create", null, { ...a, x: 2 })).not.toBe(hashCommand("create", null, a));
    expect(stableStringify({ b: undefined, a: 1 })).toBe('{"a":1}');
  });
});
