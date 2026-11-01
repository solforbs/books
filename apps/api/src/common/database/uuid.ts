const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids from outside (request bodies, old tokens) are checked before they reach a
 * `uuid` column: PostgreSQL would reject a malformed one with an error, and an
 * unknown id should simply find nothing.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
