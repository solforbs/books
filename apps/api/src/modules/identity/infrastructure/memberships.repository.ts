import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { Role } from "@books/shared";
import { isObjectIdString, toObjectId } from "../../../common/database/object-id";
import { MEMBERSHIP_MODEL, type MembershipDoc } from "./schemas/membership.schema";

/**
 * Memberships are the one place where reading across tenants is legitimate:
 * it is how we find which businesses a person belongs to. Every query here is
 * keyed by the user, never "all memberships".
 */
@Injectable()
export class MembershipsRepository {
  constructor(@InjectModel(MEMBERSHIP_MODEL) private readonly model: Model<MembershipDoc>) {}

  async create(
    userId: string,
    tenantId: string,
    role: Role,
    session: ClientSession,
  ): Promise<MembershipDoc> {
    const [created] = await this.model.create(
      [{ userId: toObjectId(userId), tenantId: toObjectId(tenantId), role }],
      { session },
    );
    return created!.toObject();
  }

  /** The caller's active membership in one business, or null. */
  async findActive(userId: string, tenantId: string): Promise<MembershipDoc | null> {
    if (!isObjectIdString(userId) || !isObjectIdString(tenantId)) return null;
    return this.model
      .findOne({ userId: toObjectId(userId), tenantId: toObjectId(tenantId), status: "active" })
      .lean<MembershipDoc>()
      .exec();
  }

  async findActiveForUser(userId: string): Promise<MembershipDoc[]> {
    return this.model
      .find({ userId: toObjectId(userId), status: "active" })
      .sort({ createdAt: 1 })
      .lean<MembershipDoc[]>()
      .exec();
  }
}
