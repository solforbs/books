import { Injectable } from "@nestjs/common";
import type { Business, BusinessResponse, updateBusinessRequestSchema } from "@books/shared";
import type { z } from "zod";
import { AuditService } from "../../audit/application/audit.service";
import { BusinessDirectory } from "../../identity/application/business-directory";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { IdentityErrors } from "../../identity/domain/identity-errors";

export type UpdateBusinessInput = z.output<typeof updateBusinessRequestSchema>;

const auditable = (b: Business) => ({
  name: b.name,
  address: b.address,
  phone: b.phone,
  email: b.email,
  kraPin: b.kraPin ? "set" : null,
  footerNote: b.footerNote ? "set" : null,
  vatEnabled: b.vatEnabled,
  hidePricesFromStorekeepers: b.hidePricesFromStorekeepers,
});

/**
 * `PUT /business` (manage_business): saves the business details. An optional
 * field sent as null or "" is cleared; one left out keeps its value (so an older
 * app version never wipes a field it does not know). KRA PIN and VAT stay optional (G3).
 */
@Injectable()
export class UpdateBusinessUseCase {
  constructor(
    private readonly directory: BusinessDirectory,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: UpdateBusinessInput): Promise<BusinessResponse> {
    const { tenantId } = actor.access;
    const before = await this.directory.get(tenantId);
    const { name, vatEnabled, address, phone, email, kraPin, footerNote } = input;
    const optional = {
      address,
      phone,
      email,
      kraPin,
      footerNote,
      hidePricesFromStorekeepers: input.hidePricesFromStorekeepers,
    };
    const business = await this.directory.update(tenantId, {
      name,
      vatEnabled,
      ...Object.fromEntries(Object.entries(optional).filter(([, v]) => v !== undefined)),
    });
    if (!before || !business) throw IdentityErrors.notAMember();
    await this.audit.record({
      ...auditBase(actor),
      action: "business_updated",
      targetId: tenantId,
      details: { before: auditable(before), after: auditable(business) },
    });
    return { business };
  }
}
