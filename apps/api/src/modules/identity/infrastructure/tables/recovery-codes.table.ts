import { pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, timestampTz } from "../../../../common/database/columns";
import { users } from "./users.table";

/** One-time account recovery code. Only the SHA-256 hash is stored. */
export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: idColumn(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestampTz("used_at"),
    createdAt: createdAtColumn(),
  },
  (t) => [unique("recovery_codes_user_code_unique").on(t.userId, t.codeHash)],
);
