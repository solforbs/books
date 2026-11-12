import {
  isValidImei,
  normalizeImei,
  type DeliveryUnitInput,
  type TrackingType,
} from "@books/shared";

/** One typed, scanned or pasted line: a phone has an IMEI and maybe a second one. */
export interface ParsedUnit {
  imei: string;
  imei2: string;
  serial: string;
}

export type UnitProblem = "invalid" | "fourteen" | "duplicate" | "invalid2" | "serial_long";

/**
 * One unit per line. Excel pastes columns with tabs, so a second IMEI may follow after a
 * tab, comma or semicolon. Spaces and dashes inside a number are cleaned (F04 section 9.8);
 * nothing else is changed.
 */
export function parseUnits(text: string, tracking: TrackingType): ParsedUnit[] {
  const units: ParsedUnit[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === "") continue;
    if (tracking === "serial") {
      units.push({ imei: "", imei2: "", serial: raw.trim() });
      continue;
    }
    const [first = "", second = ""] = raw.split(/[\t,;]/);
    units.push({ imei: normalizeImei(first), imei2: normalizeImei(second), serial: "" });
  }
  return units;
}

/** How many times each IMEI (either of the two) appears in the whole delivery. */
export function countNumbers(units: ParsedUnit[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const unit of units) {
    for (const value of [unit.imei, unit.imei2]) {
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

export function unitProblems(
  unit: ParsedUnit,
  tracking: TrackingType,
  counts: Map<string, number>,
): UnitProblem[] {
  const problems: UnitProblem[] = [];
  if (tracking === "serial") {
    if (unit.serial.length > 64) problems.push("serial_long");
    return problems;
  }
  if (!isValidImei(unit.imei)) problems.push(/^\d{14}$/.test(unit.imei) ? "fourteen" : "invalid");
  if (unit.imei2 && !isValidImei(unit.imei2)) problems.push("invalid2");
  if ((counts.get(unit.imei) ?? 0) > 1 || (unit.imei2 && (counts.get(unit.imei2) ?? 0) > 1)) {
    problems.push("duplicate");
  }
  return problems;
}

/** The request shape for a unit; the second IMEI is left out when empty. */
export function toUnitInput(unit: ParsedUnit): DeliveryUnitInput {
  if (unit.serial) return { serial: unit.serial };
  return { imei: unit.imei, ...(unit.imei2 ? { imei2: unit.imei2 } : {}) };
}

/** Adds one line to a list text, keeping it tidy (one unit per line). */
export function appendLine(text: string, line: string): string {
  const base = text.replace(/\s+$/, "");
  return base === "" ? line : `${base}\n${line}`;
}
