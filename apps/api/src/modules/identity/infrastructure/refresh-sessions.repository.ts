import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { toObjectId } from "../../../common/database/object-id";
import { REFRESH_SESSION_MODEL, type RefreshSessionDoc } from "./schemas/refresh-session.schema";

export interface NewRefreshSession {
  familyId: string;
  tokenHash: string;
  userId: string;
  activeTenantId: string | null;
  expiresAt: Date;
  userAgent: string;
  ip: string;
}

@Injectable()
export class RefreshSessionsRepository {
  constructor(
    @InjectModel(REFRESH_SESSION_MODEL) private readonly model: Model<RefreshSessionDoc>,
  ) {}

  async create(s: NewRefreshSession): Promise<void> {
    await this.model.create({
      ...s,
      userId: toObjectId(s.userId),
      activeTenantId: s.activeTenantId ? toObjectId(s.activeTenantId) : null,
    });
  }

  async findByHash(tokenHash: string): Promise<RefreshSessionDoc | null> {
    return this.model.findOne({ tokenHash }).lean<RefreshSessionDoc>().exec();
  }

  /** Atomic single use: only one caller can turn an active token into `used`. */
  async markUsed(tokenHash: string): Promise<boolean> {
    const res = await this.model
      .updateOne({ tokenHash, status: "active" }, { $set: { status: "used", usedAt: new Date() } })
      .exec();
    return res.modifiedCount === 1;
  }

  async isFamilyActive(familyId: string, now: Date): Promise<boolean> {
    const found = await this.model.exists({
      familyId,
      status: "active",
      expiresAt: { $gt: now },
    });
    return found !== null;
  }

  async setActiveTenant(familyId: string, tenantId: string): Promise<void> {
    await this.model
      .updateMany(
        { familyId, status: "active" },
        { $set: { activeTenantId: toObjectId(tenantId) } },
      )
      .exec();
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.model
      .updateMany(
        { familyId, status: { $ne: "revoked" } },
        { $set: { status: "revoked", revokedAt: new Date() } },
      )
      .exec();
  }

  /** Signs the user out everywhere, optionally keeping the current session. */
  async revokeAllForUser(
    userId: string,
    exceptFamilyId?: string,
    session?: ClientSession,
  ): Promise<void> {
    const filter: Record<string, unknown> = {
      userId: toObjectId(userId),
      status: { $ne: "revoked" },
    };
    if (exceptFamilyId) filter.familyId = { $ne: exceptFamilyId };
    await this.model
      .updateMany(filter, { $set: { status: "revoked", revokedAt: new Date() } })
      .session(session ?? null)
      .exec();
  }
}
