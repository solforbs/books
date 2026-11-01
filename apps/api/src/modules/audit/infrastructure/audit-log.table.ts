import { check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, oneOf, timestampTz } from "../../../common/database/columns";

export const AUDIT_OUTCOMES = ["success", "failure"] as const;

/**
 * Append-only who-did-what log (G4). The app role may only INSERT and SELECT
 * here (see the grants migration). Never holds passwords, tokens or full phone
 * numbers: identifiers are masked before they get here.
 *
 * `tenant_id` / `user_id` have no foreign keys on purpose: an audit write must
 * never fail because of the state of another table (e.g. a failed login for an
 * unknown user), and the log outlives whatever it describes.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: idColumn(),
    action: text("action").notNull(),
    outcome: text("outcome").$type<(typeof AUDIT_OUTCOMES)[number]>().notNull(),
    tenantId: uuid("tenant_id"),
    userId: uuid("user_id"),
    identifierMasked: text("identifier_masked"),
    reason: text("reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    at: timestampTz("at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_tenant_at_idx").on(t.tenantId, t.at.desc()),
    index("audit_log_user_at_idx").on(t.userId, t.at.desc()),
    check("audit_log_outcome", oneOf(t.outcome, AUDIT_OUTCOMES)),
  ],
);

export type NewAuditEntry = typeof auditLog.$inferInsert;
