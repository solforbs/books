import type { LedgerAccount } from "../infrastructure/tables/ledger-lines.table";

/** One side of an entry as the use cases write it: debit positive, credit negative. */
export interface LedgerLineInput {
  account: LedgerAccount;
  /** Required for `supplier_payable`. */
  supplierId?: string;
  /** Required for `money_place`. */
  moneyPlaceId?: string;
  amountCents: number;
}

/** Zero-amount lines carry no information and the database refuses them: drop them here. */
export function meaningfulLines(lines: LedgerLineInput[]): LedgerLineInput[] {
  return lines.filter((l) => l.amountCents !== 0);
}

/** Double entry: the lines of one entry add up to zero (ARCH-02 section 5, invariant 1). */
export function assertBalanced(lines: LedgerLineInput[]): void {
  const sum = lines.reduce((total, l) => total + l.amountCents, 0);
  if (sum !== 0) throw new Error(`ledger entry does not balance (off by ${sum} cents)`);
}
