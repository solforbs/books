/** PostgreSQL SQLSTATE codes the API reacts to. */
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";
export const PG_INSUFFICIENT_PRIVILEGE = "42501";

const SQLSTATE_RE = /^[0-9A-Z]{5}$/;

/**
 * The SQLSTATE of a database error. Drizzle wraps driver errors (the original is
 * its `cause`), so the chain is followed a few levels deep.
 */
export function pgErrorCode(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && SQLSTATE_RE.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export const isUniqueViolation = (err: unknown) => pgErrorCode(err) === PG_UNIQUE_VIOLATION;

/** The constraint a database error names (unique, foreign key, check), if any. */
export function pgConstraint(err: unknown): string | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const constraint = (current as { constraint?: unknown }).constraint;
    if (typeof constraint === "string") return constraint;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}
