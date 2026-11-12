/**
 * The cost of each piece of a layer when the supplier charged `totalCents` for `pieces` pieces.
 * A piece cost is not always a whole number of cents (10,000 / 3), and money is never a float
 * (rule 4): every piece gets the whole-cent share and the first `remainder` pieces one cent
 * more, so the piece costs always add up to exactly the line total.
 */
export function splitCost(totalCents: number, pieces: number): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error("invalid cost total");
  if (!Number.isInteger(pieces) || pieces < 1) throw new Error("invalid piece count");
  const base = Math.floor(totalCents / pieces);
  const remainder = totalCents - base * pieces;
  return Array.from({ length: pieces }, (_, i) => (i < remainder ? base + 1 : base));
}

/**
 * The cost of piece number `index` (0-based) of the split above, calculated directly so a
 * layer of a million pieces never builds an array: only the units that exist are costed.
 */
export function unitShare(totalCents: number, pieces: number, index: number): number {
  const base = Math.floor(totalCents / pieces);
  const remainder = totalCents - base * pieces;
  return index < remainder ? base + 1 : base;
}
