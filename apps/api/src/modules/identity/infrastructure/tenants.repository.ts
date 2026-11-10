import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { DB, type Database, type Executor } from "../../../common/database/database.types";
import { isUuid } from "../../../common/database/uuid";
import { tenants, type TenantRow } from "./tables/tenants.table";

export type TenantDetails = Pick<
  TenantRow,
  "name" | "address" | "phone" | "email" | "kraPin" | "footerNote" | "vatEnabled"
>;

@Injectable()
export class TenantsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(name: string, createdBy: string, tx: Executor): Promise<TenantRow> {
    const [created] = await tx.insert(tenants).values({ name, createdBy }).returning();
    return created!;
  }

  /** Active businesses by id, for building the membership list. */
  async findActiveByIds(ids: string[]): Promise<TenantRow[]> {
    const valid = ids.filter(isUuid);
    if (valid.length === 0) return [];
    return this.db
      .select()
      .from(tenants)
      .where(and(inArray(tenants.id, valid), eq(tenants.status, "active")));
  }

  async findById(id: string): Promise<TenantRow | null> {
    if (!isUuid(id)) return null;
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return row ?? null;
  }

  async updateDetails(id: string, details: Partial<TenantDetails>): Promise<TenantRow | null> {
    const [row] = await this.db.update(tenants).set(details).where(eq(tenants.id, id)).returning();
    return row ?? null;
  }
}
