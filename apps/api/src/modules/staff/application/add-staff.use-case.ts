import { Injectable } from "@nestjs/common";
import type { CreateStaffResponse, createStaffRequestSchema } from "@books/shared";
import type { z } from "zod";
import { isUniqueViolation } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationsService } from "../../locations/application/locations.service";
import { StaffErrors } from "../domain/staff-errors";
import { canManagePerson, isOwner } from "../domain/staff-policy";

export type AddStaffInput = z.output<typeof createStaffRequestSchema>;

/**
 * `POST /staff`. Always creates a NEW person with a strong temporary password,
 * returned once, that must be changed at first login (and expires after 72 h).
 *
 * Phones and emails are not verified (no SMS), so a phone or email that already
 * belongs to any account is refused with 409 `account_exists` and nothing about
 * that account is revealed (S1a review #1): otherwise anyone could attach a
 * stranger's account to their business, or learn who is registered. People who
 * already have an account will join later with an in-person code.
 *
 * Owners may add anyone; a member with `add_staff` only cashiers and storekeepers
 * at their own locations, with the role's default switches.
 */
@Injectable()
export class AddStaffUseCase {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly members: MembersService,
    private readonly locations: LocationsService,
    private readonly audit: AuditService,
  ) {}

  async execute(actor: Actor, input: AddStaffInput): Promise<CreateStaffResponse> {
    const { access } = actor;
    const locationIds = input.role === "owner" ? [] : [...new Set(input.locationIds)];
    const customSwitches = Object.keys(input.permissions).length > 0;
    if (!canManagePerson(access, input.role, locationIds) || (customSwitches && !isOwner(access))) {
      throw StaffErrors.forbidden();
    }
    if (await this.members.accountExists(input.phone, input.email)) {
      throw StaffErrors.accountExists();
    }

    const result = await this.tenantDb
      .transaction(access.tenantId, async (t) => {
        await this.locations.assertUsable(t.tenantId, locationIds, null, t);
        const { userId, temporaryPassword } = await this.members.createPerson(
          { name: input.name, phone: input.phone, email: input.email, language: input.language },
          t,
        );
        const membershipId = await this.members.addMembership(
          t,
          userId,
          input.role,
          input.permissions,
          locationIds,
        );
        const member = (await this.members.get(t.tenantId, membershipId, t))!;
        return { member, temporaryPassword };
      })
      .catch((err: unknown) => {
        // Lost a race with a concurrent sign-up or add using the same phone/email.
        if (isUniqueViolation(err)) throw StaffErrors.accountExists();
        throw err;
      });

    this.members.forget(result.member.userId);
    await this.audit.record({
      ...auditBase(actor),
      action: "staff_added",
      targetId: result.member.membershipId,
      details: {
        newPerson: true,
        after: {
          name: result.member.name,
          phone: result.member.phone,
          email: result.member.email,
          role: result.member.role,
          locationIds: result.member.locationIds,
          permissions: result.member.permissions,
        },
      },
    });
    return result;
  }
}
