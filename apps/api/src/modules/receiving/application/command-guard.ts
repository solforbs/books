import { Injectable } from "@nestjs/common";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { DeliveryErrors } from "../domain/delivery-errors";
import { ReceivingCommandsRepository } from "../infrastructure/receiving-commands.repository";
import type { ReceivingOperation } from "../infrastructure/tables/receiving-commands.table";

export interface CommandKey {
  commandId: string;
  operation: ReceivingOperation;
  /** Fingerprint of the request (see hashCommand). */
  hash: string;
  userId: string;
}

/**
 * Makes receiving commands safe to repeat (G6). `begin` runs first in the transaction: it
 * waits for any other request with the same id, then returns the delivery of the earlier
 * identical command (a replay) or null for a new one. The same id with a different request or
 * from another person is 409 `command_conflict`. `record` stores the command with the work.
 */
@Injectable()
export class CommandGuard {
  constructor(private readonly commands: ReceivingCommandsRepository) {}

  async begin(t: TenantTx, key: CommandKey): Promise<string | null> {
    await this.commands.lock(t.tenantId, key.commandId, t);
    const found = await this.commands.findByCommandId(t.tenantId, key.commandId, t);
    if (!found) return null;
    const same =
      found.operation === key.operation &&
      found.requestHash === key.hash &&
      found.userId === key.userId;
    if (!same) throw DeliveryErrors.commandConflict();
    return found.deliveryId;
  }

  async record(t: TenantTx, key: CommandKey, deliveryId: string): Promise<void> {
    await this.commands.create(
      t.tenantId,
      {
        commandId: key.commandId,
        operation: key.operation,
        deliveryId,
        requestHash: key.hash,
        userId: key.userId,
      },
      t,
    );
  }
}
