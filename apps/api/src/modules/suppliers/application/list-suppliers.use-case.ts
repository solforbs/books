import { Injectable } from "@nestjs/common";
import type { SuppliersResponse } from "@books/shared";
import { isUuid } from "../../../common/database/uuid";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import type { SupplierStatus } from "../infrastructure/tables/suppliers.table";
import { assertCanRead, assertPermission } from "./access";
import { SupplierView } from "./supplier-view";

export interface SupplierListQuery {
  q?: string;
  status?: SupplierStatus;
  neighbour: boolean;
  limit: number;
  cursor?: { nameKey: string; id: string };
}

export const encodeCursor = (nameKey: string, id: string) =>
  Buffer.from(JSON.stringify([nameKey, id])).toString("base64url");

/** `null` when the cursor is not one this API handed out. */
export function decodeCursor(raw: string): { nameKey: string; id: string } | null {
  try {
    const [nameKey, id] = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown[];
    return typeof nameKey === "string" && !nameKey.includes("\u0000") && isUuid(id)
      ? { nameKey, id }
      : null;
  } catch {
    return null;
  }
}

/**
 * `GET /suppliers` (manage_suppliers or receive_stock) and `GET /suppliers/waiting`
 * (approve_items). Without `status`, active and waiting suppliers; hidden only when asked for.
 * Ordered by name, paged by an opaque cursor.
 */
@Injectable()
export class ListSuppliersUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly suppliers: SuppliersRepository,
    private readonly view: SupplierView,
  ) {}

  list(access: TenantAccessContext, query: SupplierListQuery): Promise<SuppliersResponse> {
    assertCanRead(access);
    return this.page(access, query);
  }

  waiting(
    access: TenantAccessContext,
    query: Pick<SupplierListQuery, "limit" | "cursor">,
  ): Promise<SuppliersResponse> {
    assertPermission(access, "approve_items");
    return this.page(access, { ...query, status: "waiting", neighbour: false });
  }

  private page(access: TenantAccessContext, query: SupplierListQuery): Promise<SuppliersResponse> {
    const { tenantId } = access;
    return this.tenantDb.transaction(tenantId, async (t) => {
      const rows = await this.suppliers.search(tenantId, query, t);
      const page = rows.slice(0, query.limit);
      const last = page[page.length - 1];
      return {
        suppliers: await this.view.many(page, access, t),
        nextCursor: rows.length > query.limit && last ? encodeCursor(last.nameKey, last.id) : null,
      };
    });
  }
}
