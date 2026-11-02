import { Injectable } from "@nestjs/common";
import type { CreateStaffResponse, createStaffRequestSchema } from "@books/shared";
import type { z } from "zod";
import { isUniqueViolation, pgConstraint } from "../../../common/database/pg-errors";
import { TenantDb } from "../../../common/tenancy/tenant-db";
import { AuditService } from "../../audit/application/audit.service";
import { MembersService } from "../../identity/application/members.service";
import { auditBase, type Actor } from "../../identity/domain/actor";
import { LocationsService } from "../../locations/application/locations.service";
import { StaffErrors } from "../domain/staff-errors";
import { canManagePerson, isOwner } from "../domain/staff-policy";

export type AddStaffInput = z.output<typeof createStaffRequestSchema>;

/**
 * `POST /staff`. A new person gets a strong temporary password, returned once,
 * that must be changed at first login. Someone who already has an account (e.g.
 * works in another business) just gets a membership here and keeps their own
 * password. Owners may add anyone; a member with `add_staff` only cashiers and
 * storekeepers at their own locations, with the role's default switches.
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
    const people = await this.members.findPeople(input.phone, input.email);
    if (people.length > 1) throw StaffErrors.identifierTaken();
    const existing = people[0] ?? null;

    const result = await this.tenantDb
      .transaction(access.tenantId, async (t) => {
        await this.locations.assertUsable(t.tenantId, locationIds, null, t);
        if (existing && (await this.members.findMembershipOf(existing.id, t.tenantId, t))) {
          throw StaffErrors.alreadyMember();
        }
        const created = existing
          ? null
          : await this.members.createPerson(
              {
                name: input.name,
                phone: input.phone,
                email: input.email,
                language: input.language,
              },
              t,
            );
        const userId = existing?.id ?? created!.userId;
        const membershipId = await this.members.addMembership(
          t,
          userId,
          input.role,
          input.permissions,
          locationIds,
        );
        const member = (await this.members.get(t.tenantId, membershipId, t))!;
        return { member, temporaryPassword: created?.temporaryPassword ?? null };
      })
      .catch((err: unknown) => {
        // Lost a race with a concurrent request adding the same person.
        if (!isUniqueViolation(err)) throw err;
        if (pgConstraint(err)?.startsWith("memberships_")) throw StaffErrors.alreadyMember();
        throw StaffErrors.identifierTaken();
      });

    this.members.forget(result.member.userId);
    await this.audit.record({
      ...auditBase(actor),
      action: "staff_added",
      targetId: result.member.membershipId,
      details: {
        newPerson: result.temporaryPassword !== null,
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
