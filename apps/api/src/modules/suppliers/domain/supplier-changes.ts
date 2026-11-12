import { normalizeForCompare, type PaymentRule } from "@books/shared";
import { ruleOf, ruleToColumns } from "./payment-rule";
import type { SupplierRow } from "../infrastructure/tables/suppliers.table";

/** The editable fields, as the update and approve requests carry them (all optional). */
export interface SupplierFields {
  name?: string;
  phone?: string;
  paymentRule?: PaymentRule;
  currency?: SupplierRow["currency"];
  isNeighbour?: boolean;
  kraPin?: string | null;
  marketOrLocation?: string | null;
  notes?: string | null;
}

export type SupplierSet = Partial<
  Pick<
    SupplierRow,
    | "name"
    | "nameKey"
    | "phone"
    | "paymentType"
    | "paymentPeriodValue"
    | "paymentPeriodUnit"
    | "currency"
    | "isNeighbour"
    | "kraPin"
    | "marketOrLocation"
    | "notes"
  >
>;

export interface SupplierChange {
  set: SupplierSet;
  /** Only the fields that really changed: what the audit records. */
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

/** What a request would really change on this row; fields equal to today's value are dropped. */
export function diffSupplier(row: SupplierRow, input: SupplierFields): SupplierChange {
  const change: SupplierChange = { set: {}, before: {}, after: {} };
  const note = (field: string, before: unknown, after: unknown) => {
    change.before[field] = before;
    change.after[field] = after;
  };
  if (input.name !== undefined && input.name !== row.name) {
    change.set.name = input.name;
    change.set.nameKey = normalizeForCompare(input.name);
    note("name", row.name, input.name);
  }
  if (input.phone !== undefined && input.phone !== row.phone) {
    change.set.phone = input.phone;
    note("phone", row.phone, input.phone);
  }
  if (input.paymentRule !== undefined) {
    const current = ruleOf(row);
    if (JSON.stringify(current) !== JSON.stringify(input.paymentRule)) {
      Object.assign(change.set, ruleToColumns(input.paymentRule));
      note("paymentRule", current, input.paymentRule);
    }
  }
  const plain = ["currency", "isNeighbour", "kraPin", "marketOrLocation", "notes"] as const;
  for (const field of plain) {
    const value = input[field];
    if (value !== undefined && value !== row[field]) {
      Object.assign(change.set, { [field]: value });
      note(field, row[field], value);
    }
  }
  return change;
}

export const hasChanges = (change: SupplierChange) => Object.keys(change.set).length > 0;
