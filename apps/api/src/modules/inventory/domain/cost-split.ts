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
