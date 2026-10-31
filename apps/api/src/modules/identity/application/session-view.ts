import { Injectable } from "@nestjs/common";
import type { Membership, SessionResponse } from "@books/shared";
import type { ActiveMembership } from "../domain/active-tenant";
import { MembershipsRepository } from "../infrastructure/memberships.repository";
import type { UserDoc } from "../infrastructure/schemas/user.schema";
import { TenantsRepository } from "../infrastructure/tenants.repository";

export type MembershipView = ActiveMembership & { businessName: string };

/** Builds the contract's SessionResponse from stored records. */
@Injectable()
export class SessionView {
  constructor(
    private readonly memberships: MembershipsRepository,
    private readonly tenants: TenantsRepository,
  ) {}

  /** Active memberships in active businesses only. */
  async membershipsOf(userId: string): Promise<MembershipView[]> {
    const rows = await this.memberships.findActiveForUser(userId);
    const tenants = await this.tenants.findActiveByIds(rows.map((m) => m.tenantId.toHexString()));
    const names = new Map(tenants.map((t) => [t._id.toHexString(), t.name]));
    return rows
      .filter((m) => names.has(m.tenantId.toHexString()))
      .map((m) => ({
        tenantId: m.tenantId.toHexString(),
        role: m.role,
        businessName: names.get(m.tenantId.toHexString())!,
      }));
  }

  build(
    user: UserDoc,
    memberships: MembershipView[],
    activeTenantId: string | null,
  ): SessionResponse {
    const list: Membership[] = memberships.map((m) => ({
      tenantId: m.tenantId,
      businessName: m.businessName,
      role: m.role,
    }));
    return {
      user: {
        id: user._id.toHexString(),
        name: user.name,
        phone: user.phone ?? null,
        email: user.email ?? null,
        language: user.language,
        mustChangePassword: user.mustChangePassword,
      },
      memberships: list,
      activeTenantId,
    };
  }
}
