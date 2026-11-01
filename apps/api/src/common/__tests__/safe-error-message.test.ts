import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";
import { isUniqueViolation, pgErrorCode } from "../database/pg-errors";
import { safeErrorMessage, safeErrorStack } from "../errors/safe-error-message";

describe("database errors in logs", () => {
  const pgError = Object.assign(new Error("duplicate key value violates unique constraint"), {
    code: "23505",
  });
  const wrapped = new DrizzleQueryError(
    'insert into "users" ("phone", "password_hash") values ($1, $2)',
    ["+254712345678", "$argon2id$v=19$secret-hash"],
    pgError,
  );

  it("never logs query parameters (phones, hashes), only the SQL and the database error", () => {
    for (const text of [safeErrorMessage(wrapped), safeErrorStack(wrapped)]) {
      expect(text).toContain("[23505]");
      expect(text).toContain('insert into "users"');
      expect(text).not.toContain("+254712345678");
      expect(text).not.toContain("argon2id");
    }
  });

  it("finds the SQLSTATE through Drizzle's wrapper", () => {
    expect(pgErrorCode(wrapped)).toBe("23505");
    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(new Error("other"))).toBe(false);
    expect(safeErrorMessage(new Error("plain"))).toBe("plain");
  });
});
