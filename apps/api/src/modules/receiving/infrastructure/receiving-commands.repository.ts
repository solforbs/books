import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { TenantDb, type TenantTx } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { receivingCommands, type ReceivingCommandRow } from "./tables/receiving-commands.table";

@Injectable()
export class ReceivingCommandsRepository extends TenantScopedRepository<typeof receivingCommands> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, receivingCommands);
  }

  /**
   * Serialises two requests with the same command id until the transaction ends: the second
   * waits for the first to commit, then finds its record and replays it.
   */
  async lock(tenantId: string, commandId: string, within: TenantTx): Promise<void> {
    await within.tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`receiving-command:${tenantId}:${commandId}`}, 0))`,
    );
  }

  findByCommandId(
    tenantId: string,
    commandId: string,
    within: TenantTx,
  ): Promise<ReceivingCommandRow | null> {
    return this.findOne(tenantId, eq(receivingCommands.commandId, commandId), within);
  }
}
