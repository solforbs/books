import { pgErrorCode } from "../database/pg-errors";

/**
 * A loggable description of an error. Drizzle's query errors put the bound
 * parameters (password hashes, token hashes, phone numbers) in their message
 * and stack, so for those only the SQL text and the database's own error are
 * kept.
 */
export function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const query = (err as { query?: unknown }).query;
  if (typeof query === "string" && "params" in err) {
    const cause = err.cause instanceof Error ? err.cause.message : "unknown cause";
    const code = pgErrorCode(err) ?? "-";
    return `Database query failed [${code}]: ${cause}\n  query: ${query}`;
  }
  return err.message;
}

/** Like `safeErrorMessage`, plus the stack for ordinary errors. */
export function safeErrorStack(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const safe = safeErrorMessage(err);
  return safe === err.message ? (err.stack ?? safe) : safe;
}
