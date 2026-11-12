import { Injectable } from "@nestjs/common";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { TenantScopedRepository } from "../../../common/tenancy/tenant-scoped.repository";
import { ledgerEntries } from "./tables/ledger-entries.table";

/** Entries are only ever created and read: there is no update or delete (G4). */
@Injectable()
export class LedgerEntriesRepository extends TenantScopedRepository<typeof ledgerEntries> {
  constructor(tenantDb: TenantDb) {
    super(tenantDb, ledgerEntries);
  }
}
