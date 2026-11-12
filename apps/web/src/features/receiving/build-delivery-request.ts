import type { CreateDeliveryRequest, PaymentRule, Supplier } from "@books/shared";
import { paymentIssues, paymentRowCents, type PaymentDraft } from "./payment-draft";
import { rowCost, rowPieces, rowQuantity } from "./sheet-math";
import type { SheetRow } from "./sheet-state";
import { countNumbers, parseUnits, toUnitInput, unitProblems, type ParsedUnit } from "./unit-lines";

export interface SheetTotals {
  rows: number;
  pieces: number;
  knownTotalCents: number;
  pendingLines: number;
}

export interface SheetInput {
  rows: SheetRow[];
  supplier: Supplier | null;
  locationId: string;
  invoiceNumber: string;
  note: string;
  payment: PaymentDraft;
  /** Only for this delivery; null means the supplier's own rule. */
  paymentRule: PaymentRule | "invalid" | null;
  allowIncomplete: boolean;
  confirmSoldBefore: boolean;
  canSeeCost: boolean;
  canPay: boolean;
}

export type BuildResult =
  { ok: true; request: Omit<CreateDeliveryRequest, "commandId"> } | { ok: false; issues: string[] };

export function computeTotals(rows: SheetRow[], canSeeCost: boolean): SheetTotals {
  const totals: SheetTotals = { rows: rows.length, pieces: 0, knownTotalCents: 0, pendingLines: 0 };
  for (const row of rows) {
    totals.pieces += rowPieces(row) ?? 0;
    const cost = canSeeCost ? rowCost(row) : ({ state: "pending" } as const);
    if (cost.state === "known") totals.knownTotalCents += cost.totalCents;
    else totals.pendingLines += 1;
  }
  return totals;
}

export function rowUnits(row: SheetRow): ParsedUnit[] {
  const tracking = row.product.trackingType;
  return tracking === "quantity" ? [] : parseUnits(row.unitsText, tracking);
}

/** All units of the whole delivery, to find the same IMEI typed twice across rows. */
export function allUnits(rows: SheetRow[]): ParsedUnit[] {
  return rows.flatMap(rowUnits);
}

/** Rows of IMEI or serial products that have fewer numbers than pieces. */
export function incompleteRows(rows: SheetRow[]): SheetRow[] {
  return rows.filter((row) => {
    const pieces = rowPieces(row);
    return (
      row.product.trackingType !== "quantity" && pieces !== null && rowUnits(row).length < pieces
    );
  });
}

function rowIssues(rows: SheetRow[]): string[] {
  const issues: string[] = [];
  const counts = countNumbers(allUnits(rows));
  for (const row of rows) {
    if (rowQuantity(row) === null) issues.push("receiving.issue.quantity");
    if (row.cost.trim() !== "" && rowCost(row).state === "invalid") {
      issues.push("receiving.issue.cost");
    }
    const tracking = row.product.trackingType;
    if (tracking === "quantity") continue;
    const units = rowUnits(row);
    const pieces = rowPieces(row);
    if (units.some((u) => unitProblems(u, tracking, counts).length > 0)) {
      issues.push("receiving.issue.numbers");
    }
    if (pieces !== null && units.length > pieces) issues.push("receiving.issue.tooManyNumbers");
  }
  return [...new Set(issues)];
}

/** Checks the whole sheet and, when it is fine, builds the request (without its commandId). */
export function buildDeliveryRequest(input: SheetInput): BuildResult {
  const issues: string[] = [];
  if (!input.supplier) issues.push("receiving.issue.supplier");
  else if (input.supplier.currency === "USD") issues.push("receiving.issue.usdSupplier");
  if (input.locationId === "") issues.push("receiving.issue.location");
  if (input.paymentRule === "invalid") issues.push("receiving.issue.rulePeriod");
  if (input.rows.length === 0) issues.push("receiving.issue.noRows");
  issues.push(...rowIssues(input.rows));
  const totals = computeTotals(input.rows, input.canSeeCost);
  if (input.canPay && input.canSeeCost) {
    issues.push(...paymentIssues(input.payment, totals.knownTotalCents, totals.pendingLines));
  }
  if (!input.allowIncomplete && incompleteRows(input.rows).length > 0) {
    issues.push("receiving.issue.incomplete");
  }
  if (issues.length > 0 || !input.supplier) return { ok: false, issues: [...new Set(issues)] };

  const paying = input.canPay && input.canSeeCost && input.payment.mode !== "credit";
  const invoiceNumber = input.invoiceNumber.trim();
  const note = input.note.trim();
  return {
    ok: true,
    request: {
      supplierId: input.supplier.id,
      locationId: input.locationId,
      ...(invoiceNumber ? { invoiceNumber } : {}),
      ...(note ? { note } : {}),
      ...(input.paymentRule && input.paymentRule !== "invalid" && input.canPay
        ? { paymentRule: input.paymentRule }
        : {}),
      payments: paying
        ? input.payment.rows.map((r) => ({
            moneyPlaceId: r.moneyPlaceId,
            amountCents: paymentRowCents(r) ?? 0,
          }))
        : [],
      lines: input.rows.map((row) => {
        const cost = input.canSeeCost ? rowCost(row) : null;
        return {
          productId: row.product.id,
          ...(row.packUnitId ? { packUnitId: row.packUnitId } : {}),
          quantity: rowQuantity(row) ?? 1,
          ...(cost?.state === "known" ? { lineTotalCents: cost.totalCents } : {}),
          units: rowUnits(row).map(toUnitInput),
        };
      }),
      allowIncomplete: input.allowIncomplete,
      confirmSoldBefore: input.confirmSoldBefore,
    },
  };
}
