/**
 * Money is always stored as an integer number of cents (KES minor units).
 * Never use floating-point amounts for money anywhere in the system.
 */
export type Cents = number & { readonly __brand: "Cents" };

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Money must be a whole number of cents, got ${value}`);
  }
  return value as Cents;
}

/** Converts a shillings amount typed by a user (e.g. "1,250.50") to cents. */
export function parseShillings(input: string): Cents {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Not a valid amount: "${input}"`);
  }
  const [whole = "0", fraction = ""] = cleaned.replace("-", "").split(".");
  const value = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return cents(cleaned.startsWith("-") ? -value : value);
}

/** Formats cents for display, e.g. 125050 -> "1,250.50". */
export function formatShillings(amount: Cents, opts: { decimals?: boolean } = {}): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 100).toLocaleString("en-KE");
  const fraction = String(abs % 100).padStart(2, "0");
  const text = opts.decimals === false && fraction === "00" ? whole : `${whole}.${fraction}`;
  return negative ? `-${text}` : text;
}

export function addCents(...amounts: Cents[]): Cents {
  return cents(amounts.reduce((sum, a) => sum + a, 0));
}
