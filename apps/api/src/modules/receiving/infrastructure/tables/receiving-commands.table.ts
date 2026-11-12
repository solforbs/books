import { check, foreignKey, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { createdAtColumn, idColumn, oneOf } from "../../../../common/database/columns";
import { tenants } from "../../../identity/infrastructure/tables/tenants.table";
import { users } from "../../../identity/infrastructure/tables/users.table";
import { deliveries } from "./deliveries.table";

export const RECEIVING_OPERATIONS = ["create", "costs", "units"] as const;
export type ReceivingOperation = (typeof RECEIVING_OPERATIONS)[number];

/**
 * The client `commandId` of every receiving command that was applied (G6): sending the same
 * one again finds this row and returns the delivery instead of doing it twice. The body hash
 * tells "the same request again" from "a different request with a reused id". Written in the
 * same transaction as the work, so a command that failed leaves no row. Append-only.
 */
export const receivingCommands = pgTable(
  "receiving_commands",
  {
    id: idColumn(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    commandId: text("command_id").notNull(),
    operation: text("operation").$type<ReceivingOperation>().notNull(),
    deliveryId: uuid("delivery_id").notNull(),
    requestHash: text("request_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAtColumn(),
  },
  (t) => [
    unique("receiving_commands_command_unique").on(t.tenantId, t.commandId),
    check("receiving_commands_operation", oneOf(t.operation, RECEIVING_OPERATIONS)),
    foreignKey({
      name: "receiving_commands_delivery_fk",
      columns: [t.tenantId, t.deliveryId],
      foreignColumns: [deliveries.tenantId, deliveries.id],
    }).onDelete("restrict"),
  ],
);

export type ReceivingCommandRow = typeof receivingCommands.$inferSelect;
