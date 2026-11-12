import { DELIVERY_ERROR_CODES, UNIT_STATUSES, isValidImei } from "@books/shared";
import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { so } from "@/i18n/so";
import { errorMessageKey, ApiError } from "@/lib/api";
import { IMEI_A, IMEI_B, IMEI_C, charger, iphone, supplier } from "@/test/receiving-fixtures";
import { buildDeliveryRequest, type SheetInput } from "../build-delivery-request";
import { creditDraft, paymentIssues } from "../payment-draft";
import { rowCost } from "../sheet-math";
import { sheetReducer, type SheetRow } from "../sheet-state";
import { countNumbers, parseUnits, unitProblems } from "../unit-lines";

const row = (patch: Partial<SheetRow> = {}): SheetRow => ({
  key: "r1",
  product: charger,
  packUnitId: "",
  quantity: "1",
  costMode: "total",
  cost: "",
  unitsText: "",
  ...patch,
});

const input = (rows: SheetRow[], patch: Partial<SheetInput> = {}): SheetInput => ({
  rows,
  supplier,
  locationId: "l1",
  invoiceNumber: "",
  note: "",
  payment: creditDraft,
  paymentRule: null,
  allowIncomplete: false,
  confirmSoldBefore: false,
  canSeeCost: true,
  canPay: true,
  ...patch,
});

function lookup(path: string): string | undefined {
  let node: unknown = en;
  for (const part of path.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === "string" ? node : undefined;
}

describe("test IMEIs", () => {
  it("are valid", () => {
    for (const imei of [IMEI_A, IMEI_B, IMEI_C]) expect(isValidImei(imei)).toBe(true);
  });
});

describe("sheetReducer", () => {
  it("adds one row per product and 1 more for a repeat scan", () => {
    let rows = sheetReducer([], { type: "add", product: charger, key: "a" });
    rows = sheetReducer(rows, { type: "add", product: iphone, key: "b" });
    rows = sheetReducer(rows, { type: "add", product: charger, key: "c" });
    expect(rows.map((r) => [r.product.id, r.quantity])).toEqual([
      ["p-charger", "2"],
      ["p-iphone", "1"],
    ]);
  });

  it("restarts at 1 when the typed quantity was not a number", () => {
    const rows = sheetReducer([row({ quantity: "abc" })], {
      type: "add",
      product: charger,
      key: "x",
    });
    expect(rows[0]?.quantity).toBe("1");
  });
});

describe("costs", () => {
  it("turns cost each into a whole-cent line total", () => {
    expect(rowCost(row({ quantity: "20", costMode: "each", cost: "450.50" }))).toEqual({
      state: "known",
      totalCents: 901_000,
    });
  });

  it("keeps a typed line total as it is and treats empty as pending", () => {
    expect(rowCost(row({ cost: "9,000" }))).toEqual({ state: "known", totalCents: 900_000 });
    expect(rowCost(row())).toEqual({ state: "pending" });
  });

  it("refuses zero, negative, text and too many decimals", () => {
    for (const cost of ["0", "-5", "abc", "1.234"]) {
      expect(rowCost(row({ cost })).state, cost).toBe("invalid");
    }
  });
});

describe("unit lines", () => {
  it("parses one unit per line with an optional second IMEI", () => {
    const units = parseUnits(`4901 5420-3237 518\n${IMEI_B};${IMEI_C}\n\n`, "imei");
    expect(units).toEqual([
      { imei: IMEI_A, imei2: "", serial: "" },
      { imei: IMEI_B, imei2: IMEI_C, serial: "" },
    ]);
  });

  it("finds invalid, 14-digit and repeated numbers", () => {
    const units = parseUnits(`${IMEI_A}\n${IMEI_A}\n12345678901234\nabc`, "imei");
    const counts = countNumbers(units);
    expect(units.map((u) => unitProblems(u, "imei", counts))).toEqual([
      ["duplicate"],
      ["duplicate"],
      ["fourteen"],
      ["invalid"],
    ]);
  });

  it("takes serial numbers as typed", () => {
    expect(parseUnits("SN-1\nSN-2", "serial").map((u) => u.serial)).toEqual(["SN-1", "SN-2"]);
  });
});

describe("payment rules of the screen", () => {
  it("accepts credit always, and checks part and full against the known cost", () => {
    const place = (amount: string) => ({
      mode: "part" as const,
      rows: [{ key: "k", moneyPlaceId: "mp", amount }],
    });
    expect(paymentIssues(creditDraft, 0, 0)).toEqual([]);
    expect(paymentIssues(place("400"), 1000_00, 0)).toEqual([]);
    expect(paymentIssues(place("1000"), 1000_00, 0)).toEqual(["receiving.issue.partIsFull"]);
    expect(paymentIssues(place("2000"), 1000_00, 0)).toEqual(["receiving.issue.paymentTooMuch"]);
    expect(paymentIssues({ ...place("1000"), mode: "full" }, 1000_00, 1)).toEqual([
      "receiving.issue.fullWithPending",
    ]);
  });
});

describe("buildDeliveryRequest", () => {
  it("builds a credit request without costs when nothing was typed", () => {
    const result = buildDeliveryRequest(input([row({ quantity: "10" })]));
    expect(result).toMatchObject({
      ok: true,
      request: { supplierId: "s1", locationId: "l1", payments: [], lines: [{ quantity: 10 }] },
    });
  });

  it("never sends totals or payments for people who cannot see costs", () => {
    const result = buildDeliveryRequest(
      input([row({ cost: "500" })], {
        canSeeCost: false,
        canPay: false,
        payment: { mode: "full", rows: [{ key: "k", moneyPlaceId: "mp", amount: "500" }] },
      }),
    );
    expect(result.ok && JSON.stringify(result.request)).not.toContain("lineTotalCents");
    expect(result.ok && result.request.payments).toEqual([]);
  });

  it("reports every problem it finds, once each", () => {
    const result = buildDeliveryRequest(
      input([row({ quantity: "0" }), row({ key: "r2", quantity: "x" })], { supplier: null }),
    );
    expect(result).toEqual({
      ok: false,
      issues: ["receiving.issue.supplier", "receiving.issue.quantity"],
    });
  });
});

describe("texts", () => {
  const keys = [
    ...[
      "supplier",
      "usdSupplier",
      "location",
      "noRows",
      "quantity",
      "cost",
      "numbers",
      "tooManyNumbers",
      "incomplete",
      "rulePeriod",
      "fullWithPending",
      "nothingToPay",
      "chooseMoneyPlace",
      "paymentAmount",
      "samePlaceTwice",
      "paymentTooMuch",
      "fullMustMatch",
      "partIsFull",
    ].map((k) => `receiving.issue.${k}`),
    ...["invalid", "fourteen", "duplicate", "invalid2", "serial_long"].map(
      (k) => `receiving.unit.problem.${k}`,
    ),
    ...UNIT_STATUSES.map((s) => `receiving.unitStatus.${s}`),
  ];

  it("exist in English and Somali for every issue, unit problem and unit status", () => {
    for (const key of keys) {
      expect(lookup(key), key).toBeTruthy();
      let node: unknown = so;
      for (const part of key.split(".")) node = (node as Record<string, unknown>)[part];
      expect(typeof node, key).toBe("string");
    }
  });

  it("maps every delivery error code to its own plain message", () => {
    for (const code of DELIVERY_ERROR_CODES) {
      const key = errorMessageKey(new ApiError(400, code, code));
      expect(key).toBe(`errors.${code}`);
      expect(lookup(key), key).toBeTruthy();
      expect(lookup(key)).not.toBe(en.errors.unknown);
    }
  });
});
