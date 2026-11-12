import { isValidImei, normalizeImei, type DeliveryUnitInput } from "@books/shared";

export type TrackingKind = "imei" | "serial" | "quantity";

/** One IMEI/serial unit with its numbers cleaned (spaces and dashes of IMEIs removed). */
export interface UnitNumbers {
  imei: string | null;
  imei2: string | null;
  serial: string | null;
}

export type UnitProblem =
  | { kind: "units_not_allowed" }
  | { kind: "invalid_imei"; value: string; reason: "format" | "serial_required" | "imei_required" };

export type PreparedUnits =
  { ok: true; units: UnitNumbers[] } | { ok: false; problem: UnitProblem };

/**
 * Checks the unit list of one line against the product's tracking type (F04 section 4.3):
 * quantity products carry no units; IMEI products need a valid IMEI each (15 digits, check
 * digit), a second IMEI and a serial are optional; serial products need a serial each and no
 * IMEI. Spaces and dashes are removed from IMEIs ("cleaned automatically where safe", F04 9.8);
 * a 14-digit value is rejected as invalid, which is the "flagged for review" of the spec.
 */
export function prepareUnits(tracking: TrackingKind, inputs: DeliveryUnitInput[]): PreparedUnits {
  if (tracking === "quantity") {
    return inputs.length > 0 ? { ok: false, problem: { kind: "units_not_allowed" } } : empty();
  }
  const units: UnitNumbers[] = [];
  for (const input of inputs) {
    const prepared = tracking === "imei" ? prepareImeiUnit(input) : prepareSerialUnit(input);
    if (!("imei" in prepared)) return { ok: false, problem: prepared };
    units.push(prepared);
  }
  return { ok: true, units };
}

const empty = (): PreparedUnits => ({ ok: true, units: [] });

function prepareImeiUnit(input: DeliveryUnitInput): UnitNumbers | UnitProblem {
  if (!input.imei) return { kind: "invalid_imei", value: "", reason: "imei_required" };
  const imei = normalizeImei(input.imei);
  if (!isValidImei(imei)) return { kind: "invalid_imei", value: input.imei, reason: "format" };
  let imei2: string | null = null;
  if (input.imei2) {
    imei2 = normalizeImei(input.imei2);
    if (!isValidImei(imei2) || imei2 === imei) {
      return { kind: "invalid_imei", value: input.imei2, reason: "format" };
    }
  }
  return { imei, imei2, serial: input.serial ?? null };
}

function prepareSerialUnit(input: DeliveryUnitInput): UnitNumbers | UnitProblem {
  if (input.imei || input.imei2) return { kind: "units_not_allowed" };
  if (!input.serial) return { kind: "invalid_imei", value: "", reason: "serial_required" };
  return { imei: null, imei2: null, serial: input.serial };
}

/** Every number of a unit that must be unique: its IMEIs, or its serial for serial goods. */
export function numbersOf(unit: UnitNumbers): string[] {
  return [unit.imei, unit.imei2].filter((n): n is string => n !== null);
}

/**
 * The first number that appears twice among these units (F04 4.3: no duplicate inside a
 * delivery). IMEIs are unique across the business; a serial only within its product (an IMEI phone may
 * carry a serial too, and that must not repeat either).
 */
export function firstDuplicate(
  groups: { productId: string; units: UnitNumbers[] }[],
): string | null {
  const seen = new Set<string>();
  for (const { productId, units } of groups) {
    for (const unit of units) {
      const keys = numbersOf(unit).map((n) => `imei:${n}`);
      if (unit.serial !== null) keys.push(`serial:${productId}:${unit.serial}`);
      for (const key of keys) {
        if (seen.has(key)) return key.split(":").pop()!;
        seen.add(key);
      }
    }
  }
  return null;
}
