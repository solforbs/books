import { parseShillings } from "@books/shared";

export type PayMode = "credit" | "part" | "full";

export interface PaymentRowDraft {
  key: string;
  moneyPlaceId: string;
  amount: string;
}

export interface PaymentDraft {
  mode: PayMode;
  rows: PaymentRowDraft[];
}

export const creditDraft: PaymentDraft = { mode: "credit", rows: [] };

export function paymentRowCents(row: PaymentRowDraft): number | null {
  try {
    const value = parseShillings(row.amount);
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Issue keys for the payment step; empty when it is fine (or nothing is being paid). */
export function paymentIssues(
  draft: PaymentDraft,
  knownTotalCents: number,
  pendingLines: number,
): string[] {
  if (draft.mode === "credit") return [];
  const issues: string[] = [];
  if (draft.mode === "full" && pendingLines > 0) issues.push("receiving.issue.fullWithPending");
  if (knownTotalCents <= 0) return [...issues, "receiving.issue.nothingToPay"];
  let sum = 0;
  for (const row of draft.rows) {
    const cents = paymentRowCents(row);
    if (row.moneyPlaceId === "") issues.push("receiving.issue.chooseMoneyPlace");
    if (cents === null) issues.push("receiving.issue.paymentAmount");
    else sum += cents;
  }
  if (draft.rows.length === 0) issues.push("receiving.issue.chooseMoneyPlace");
  const used = draft.rows.map((r) => r.moneyPlaceId);
  if (new Set(used).size !== used.length) issues.push("receiving.issue.samePlaceTwice");
  if (sum > knownTotalCents) issues.push("receiving.issue.paymentTooMuch");
  else if (draft.mode === "full" && sum !== knownTotalCents) {
    issues.push("receiving.issue.fullMustMatch");
  } else if (draft.mode === "part" && sum === knownTotalCents) {
    issues.push("receiving.issue.partIsFull");
  }
  return [...new Set(issues)];
}
