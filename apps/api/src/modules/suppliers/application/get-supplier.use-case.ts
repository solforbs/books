import { Injectable } from "@nestjs/common";
import type { SupplierResponse } from "@books/shared";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import type { TenantAccessContext } from "../../identity/domain/auth-context";
import { SupplierErrors } from "../domain/supplier-errors";
import { SuppliersRepository } from "../infrastructure/suppliers.repository";
import { assertCanRead } from "./access";
import { SupplierView } from "./supplier-view";

/** `GET /suppliers/:id` (manage_suppliers or receive_stock), whatever the status. */
@Injectable()
export class GetSupplierUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly suppliers: SuppliersRepository,
    private readonly view: SupplierView,
  ) {}

  execute(access: TenantAccessContext, id: string): Promise<SupplierResponse> {
    assertCanRead(access);
    return this.tenantDb.transaction(access.tenantId, async (t) => {
      const row = await this.suppliers.findById(access.tenantId, id, t);
      if (!row) throw SupplierErrors.notFound();
      return { supplier: await this.view.one(row, access, t) };
    });
  }
}
