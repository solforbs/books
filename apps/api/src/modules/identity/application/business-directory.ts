import { Injectable } from "@nestjs/common";
import type { Business } from "@books/shared";
import { TenantsRepository, type TenantDetails } from "../infrastructure/tenants.repository";
import type { TenantRow } from "../infrastructure/tables/tenants.table";

const toBusiness = (t: TenantRow): Business => ({
  id: t.id,
  name: t.name,
  address: t.address,
  phone: t.phone,
  email: t.email,
  kraPin: t.kraPin,
  footerNote: t.footerNote,
  vatEnabled: t.vatEnabled,
  hidePricesFromStorekeepers: t.hidePricesFromStorekeepers,
  createdAt: t.createdAt.toISOString(),
});

/**
 * Public interface of the identity module for business details: the tenants
 * table is identity's, the business module owns the rules and endpoints.
 */
@Injectable()
export class BusinessDirectory {
  constructor(private readonly tenants: TenantsRepository) {}

  async get(tenantId: string): Promise<Business | null> {
    const row = await this.tenants.findById(tenantId);
    return row ? toBusiness(row) : null;
  }

  async update(tenantId: string, details: Partial<TenantDetails>): Promise<Business | null> {
    const row = await this.tenants.updateDetails(tenantId, details);
    return row ? toBusiness(row) : null;
  }
}
