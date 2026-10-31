import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { toObjectId } from "../../../common/database/object-id";
import { TENANT_MODEL, type TenantDoc } from "./schemas/tenant.schema";

@Injectable()
export class TenantsRepository {
  constructor(@InjectModel(TENANT_MODEL) private readonly model: Model<TenantDoc>) {}

  async create(name: string, createdBy: string, session: ClientSession): Promise<TenantDoc> {
    const [created] = await this.model.create([{ name, createdBy: toObjectId(createdBy) }], {
      session,
    });
    return created!.toObject();
  }

  /** Active businesses by id, for building the membership list. */
  async findActiveByIds(ids: string[]): Promise<TenantDoc[]> {
    if (ids.length === 0) return [];
    return this.model
      .find({ _id: { $in: ids.map(toObjectId) }, status: "active" })
      .lean<TenantDoc[]>()
      .exec();
  }
}
