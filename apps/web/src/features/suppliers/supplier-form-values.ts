import {
  KRA_PIN_PATTERN,
  normalizeSupplierPhone,
  type PaymentRule,
  type PaymentRuleType,
  type Supplier,
  type UpdateSupplierRequest,
} from "@books/shared";

export type TimeUnit = "days" | "weeks" | "months";

export interface SupplierFormValues {
  name: string;
  phone: string;
  ruleType: PaymentRuleType;
  periodValue: string;
  periodUnit: TimeUnit;
  currency: "KES" | "USD";
  isNeighbour: boolean;
  kraPin: string;
  market: string;
  notes: string;
}

export const emptySupplierValues: SupplierFormValues = {
  name: "",
  phone: "",
  ruleType: "cash",
  periodValue: "1",
  periodUnit: "months",
  currency: "KES",
  isNeighbour: false,
  kraPin: "",
  market: "",
  notes: "",
};

export function needsPeriod(type: PaymentRuleType): boolean {
  return type === "within_time" || type === "after_sold_with_latest_date";
}

/** `blankPhone` is for completing a supplier added without a phone: the person must type it. */
export function valuesFromSupplier(s: Supplier, blankPhone = false): SupplierFormValues {
  const period = "period" in s.paymentRule ? s.paymentRule.period : null;
  return {
    name: s.name,
    phone: blankPhone ? "" : (s.phone ?? ""),
    ruleType: s.paymentRule.type,
    periodValue: String(period?.value ?? 1),
    periodUnit: period?.unit ?? "months",
    // Editing needs manage/approve, who always receive these fields; the defaults only satisfy the type.
    currency: s.currency ?? "KES",
    isNeighbour: s.isNeighbour ?? false,
    kraPin: s.kraPin ?? "",
    market: s.marketOrLocation ?? "",
    notes: s.notes ?? "",
  };
}

/** Field name -> i18n key of the message to show next to it. */
export type Issues = Record<string, string>;

function ruleOf(v: SupplierFormValues, issues: Issues): PaymentRule {
  if (!needsPeriod(v.ruleType)) return { type: v.ruleType } as PaymentRule;
  const value = Number(v.periodValue.trim());
  if (!Number.isInteger(value) || value < 1 || value > 3650) {
    issues.period = "suppliers.form.invalidPeriod";
  }
  return { type: v.ruleType, period: { value, unit: v.periodUnit } } as PaymentRule;
}

interface Checked {
  name: string;
  phone: string | null;
  paymentRule: PaymentRule;
  kraPin: string | null;
  marketOrLocation: string | null;
  notes: string | null;
  issues: Issues;
}

function check(v: SupplierFormValues, phoneRequired: boolean): Checked {
  const issues: Issues = {};
  const name = v.name.trim();
  if (name.length < 2) issues.name = "validation.name_too_short";
  const phoneText = v.phone.trim();
  const phone = phoneText ? normalizeSupplierPhone(phoneText) : null;
  if (phoneText && !phone) issues.phone = "suppliers.form.invalidPhone";
  if (!phoneText && phoneRequired) issues.phone = "validation.required";
  const kra = v.kraPin.trim().toUpperCase();
  if (kra && !KRA_PIN_PATTERN.test(kra)) issues.kraPin = "validation.invalid_kra_pin";
  const paymentRule = ruleOf(v, issues);
  return {
    name,
    phone,
    paymentRule,
    kraPin: kra || null,
    marketOrLocation: v.market.trim() || null,
    notes: v.notes.trim() || null,
    issues,
  };
}

/** New supplier: optional fields are left out when empty. */
export function buildCreate(v: SupplierFormValues) {
  const c = check(v, true);
  if (Object.keys(c.issues).length > 0 || c.phone === null) {
    return { ok: false, issues: c.issues } as const;
  }
  return {
    ok: true,
    request: {
      name: c.name,
      phone: c.phone,
      paymentRule: c.paymentRule,
      currency: v.currency,
      isNeighbour: v.isNeighbour,
      ...(c.kraPin ? { kraPin: c.kraPin } : {}),
      ...(c.marketOrLocation ? { marketOrLocation: c.marketOrLocation } : {}),
      ...(c.notes ? { notes: c.notes } : {}),
    },
  } as const;
}

/** Only what changed, so an edit never re-checks fields the person did not touch. */
function changes(v: SupplierFormValues, c: Checked, original: Supplier) {
  const out: UpdateSupplierRequest = {};
  if (c.name !== original.name) out.name = c.name;
  if (c.phone !== null && c.phone !== original.phone) out.phone = c.phone;
  if (JSON.stringify(c.paymentRule) !== JSON.stringify(original.paymentRule)) {
    out.paymentRule = c.paymentRule;
  }
  if (v.currency !== original.currency) out.currency = v.currency;
  if (v.isNeighbour !== original.isNeighbour) out.isNeighbour = v.isNeighbour;
  if (c.kraPin !== original.kraPin) out.kraPin = c.kraPin;
  if (c.marketOrLocation !== original.marketOrLocation) out.marketOrLocation = c.marketOrLocation;
  if (c.notes !== original.notes) out.notes = c.notes;
  return out;
}

export function buildUpdate(v: SupplierFormValues, original: Supplier) {
  const c = check(v, false);
  if (Object.keys(c.issues).length > 0) return { ok: false, issues: c.issues } as const;
  return { ok: true, request: changes(v, c, original) } as const;
}

/** Completing a waiting supplier: the phone is always sent, plus anything fixed. */
export function buildApprove(v: SupplierFormValues, original: Supplier) {
  const c = check(v, true);
  if (Object.keys(c.issues).length > 0 || c.phone === null) {
    return { ok: false, issues: c.issues } as const;
  }
  return { ok: true, request: { ...changes(v, c, original), phone: c.phone } } as const;
}
