import { Injectable } from "@nestjs/common";
import type { Language, PermissionOverrides, Role, StaffMember } from "@books/shared";
import type { TenantTx } from "../../../common/tenancy/tenant-db";
import { generateTemporaryPassword } from "../domain/temporary-password";
import { personalWords } from "../domain/personal-words";
import { MembershipLocationsRepository } from "../infrastructure/membership-locations.repository";
import {
  MembershipsRepository,
  type MemberRecord,
  type MembershipUpdate,
} from "../infrastructure/memberships.repository";
import { PasswordHasher } from "../infrastructure/password-hasher";
import { UsersRepository } from "../infrastructure/users.repository";
import { TenantAccess } from "./tenant-access";

export interface NewPerson {
  name: string;
  phone?: string;
  email?: string;
  language: Language;
}

/**
 * Public interface of the identity module for staff management (users and
 * memberships are identity's tables). Business rules (who may do what) live in
 * the staff module; this only reads and writes. Writes take the caller's tenant
 * transaction so a whole staff change commits or fails together.
 */
@Injectable()
export class MembersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly memberships: MembershipsRepository,
    private readonly memberLocations: MembershipLocationsRepository,
    private readonly hasher: PasswordHasher,
    private readonly access: TenantAccess,
  ) {}

  async list(tenantId: string, within?: TenantTx): Promise<StaffMember[]> {
    const records = await this.memberships.listMembers(tenantId, within?.tx);
    return this.toMembers(tenantId, records, within);
  }

  async get(tenantId: string, membershipId: string, within?: TenantTx) {
    const record = await this.memberships.findMember(tenantId, membershipId, within?.tx);
    return record ? (await this.toMembers(tenantId, [record], within))[0]! : null;
  }

  /**
   * Names of people by user id, to show "added by ..." (catalog, later slices). Pass the
   * caller's transaction when inside one: a second pooled connection per request would
   * starve the pool under load.
   */
  namesOf(userIds: string[], within?: TenantTx): Promise<Map<string, string>> {
    return this.users.namesByIds(userIds, within?.tx);
  }

  /** Whether any account already uses this phone or this email. */
  accountExists(phone?: string, email?: string): Promise<boolean> {
    return this.users.existsWith(phone, email);
  }

  /**
   * Locks the person's user row for the rest of the transaction (which also holds
   * off new memberships for them) and tells whether this is their only business.
   * Their password and name belong to them, not to one business (S1a review #3, #8).
   */
  async lockIfOnlyIn(t: TenantTx, userId: string): Promise<boolean> {
    await this.users.lockById(userId, t.tx);
    return (await this.memberships.countForUser(userId, t.tx)) <= 1;
  }

  /** A new user with a strong temporary password; returns it in plain text, once. */
  async createPerson(person: NewPerson, t: TenantTx) {
    const temporaryPassword = generateTemporaryPassword(personalWords(person));
    const passwordHash = await this.hasher.hash(temporaryPassword);
    const user = await this.users.create(
      { ...person, passwordHash, mustChangePassword: true },
      t.tx,
    );
    return { userId: user.id, temporaryPassword };
  }

  async addMembership(
    t: TenantTx,
    userId: string,
    role: Role,
    overrides: PermissionOverrides,
    locationIds: string[],
  ): Promise<string> {
    const row = await this.memberships.create(userId, t.tenantId, role, t.tx, overrides);
    if (role !== "owner") await this.memberLocations.replace(t.tenantId, row.id, locationIds, t);
    this.access.forgetUser(userId);
    return row.id;
  }

  async updateMembership(t: TenantTx, membershipId: string, set: MembershipUpdate) {
    const row = await this.memberships.update(t.tenantId, membershipId, set, t.tx);
    if (row) this.access.forgetUser(row.userId);
    return row;
  }

  async replaceLocations(t: TenantTx, membershipId: string, userId: string, ids: string[]) {
    await this.memberLocations.replace(t.tenantId, membershipId, ids, t);
    this.access.forgetUser(userId);
  }

  setName(t: TenantTx, userId: string, name: string): Promise<void> {
    return this.users.setName(userId, name, t.tx);
  }

  /** Locks and returns the active owners' membership ids (see `last_owner`). */
  lockActiveOwners(t: TenantTx): Promise<string[]> {
    return this.memberships.lockActiveOwners(t.tenantId, t.tx);
  }

  /**
   * New temporary password for an existing person; returns it in plain text, once.
   * Call inside the transaction that checked `lockIfOnlyIn`, so the check and the
   * write cannot be separated by a new membership.
   */
  async resetToTemporaryPassword(t: TenantTx, userId: string): Promise<string> {
    const user = await this.users.findById(userId, t.tx);
    const temporaryPassword = generateTemporaryPassword(user ? personalWords(user) : []);
    const hash = await this.hasher.hash(temporaryPassword);
    await this.users.setTemporaryPassword(userId, hash, t.tx);
    return temporaryPassword;
  }

  /** Call after the transaction commits, so no request re-caches the old membership. */
  forget(userId: string): void {
    this.access.forgetUser(userId);
  }

  /** A location was closed: unassign everyone there (F02 §8.3). Returns their user ids. */
  async unassignLocation(t: TenantTx, locationId: string): Promise<string[]> {
    const affected = await this.memberLocations.unassignLocation(t.tenantId, locationId, t);
    if (affected.length === 0) return [];
    const members = await this.memberships.listMembers(t.tenantId, t.tx);
    const userIds = members.filter((m) => affected.includes(m.membership.id)).map((m) => m.user.id);
    userIds.forEach((id) => this.access.forgetUser(id));
    return userIds;
  }

  /** Adds one location to a member's places (e.g. the manager who created it). */
  async assignLocation(t: TenantTx, membershipId: string, userId: string, locationId: string) {
    const current = await this.memberLocations.activeByMembership(t.tenantId, [membershipId], t);
    const ids = [...(current.get(membershipId) ?? []), locationId];
    await this.replaceLocations(t, membershipId, userId, ids);
  }

  private async toMembers(
    tenantId: string,
    records: MemberRecord[],
    within?: TenantTx,
  ): Promise<StaffMember[]> {
    const ids = records.map((r) => r.membership.id);
    const places = await this.memberLocations.activeByMembership(tenantId, ids, within);
    return records.map(({ membership: m, user: u }) => ({
      membershipId: m.id,
      userId: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: m.role,
      locationIds: m.role === "owner" ? [] : (places.get(m.id) ?? []),
      permissions: m.permissionOverrides,
      status: m.status,
      mustChangePassword: u.mustChangePassword,
      // Logins into THIS business only (S1a review #4), never the person's other ones.
      lastLoginAt: m.lastLoginAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }
}
