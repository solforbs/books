import type { ClientSession, FilterQuery, Model, SortOrder, Types, UpdateQuery } from "mongoose";
import { isObjectIdString, toObjectId } from "../database/object-id";

/** Every tenant-owned document carries the business it belongs to. */
export interface TenantOwned {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
}

export interface FindOptions {
  sort?: Record<string, SortOrder>;
  limit?: number;
  skip?: number;
  session?: ClientSession;
}

/**
 * Base class for every repository of tenant-owned data (ARCH-01 §6 rule 4).
 *
 * Every method takes `tenantId` first and ANDs it into the query, overriding
 * any `tenantId` a caller put in the filter, so one business can never read or
 * change another's documents. There is deliberately no delete method (G4).
 */
export abstract class TenantScopedRepository<T extends TenantOwned> {
  protected constructor(protected readonly model: Model<T>) {}

  protected scope(tenantId: string, filter: FilterQuery<T> = {}): FilterQuery<T> {
    if (!isObjectIdString(tenantId)) throw new Error("tenantId is required");
    return { ...filter, tenantId: toObjectId(tenantId) } as FilterQuery<T>;
  }

  async findById(tenantId: string, id: string, session?: ClientSession): Promise<T | null> {
    if (!isObjectIdString(id)) return null;
    return this.findOne(tenantId, { _id: toObjectId(id) } as FilterQuery<T>, session);
  }

  async findOne(
    tenantId: string,
    filter: FilterQuery<T>,
    session?: ClientSession,
  ): Promise<T | null> {
    return this.model
      .findOne(this.scope(tenantId, filter))
      .session(session ?? null)
      .lean<T>()
      .exec();
  }

  async find(tenantId: string, filter: FilterQuery<T> = {}, opts: FindOptions = {}): Promise<T[]> {
    const query = this.model.find(this.scope(tenantId, filter)).session(opts.session ?? null);
    if (opts.sort) query.sort(opts.sort);
    if (opts.skip) query.skip(opts.skip);
    if (opts.limit) query.limit(opts.limit);
    return query.lean<T[]>().exec();
  }

  async count(tenantId: string, filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(this.scope(tenantId, filter)).exec();
  }

  async create(
    tenantId: string,
    doc: Omit<T, "_id" | "tenantId">,
    session?: ClientSession,
  ): Promise<T> {
    const scoped = { ...doc, tenantId: this.scope(tenantId).tenantId };
    const [created] = await this.model.create([scoped], { session: session ?? null });
    return created!.toObject() as T;
  }

  /** Returns the number of matched documents. `tenantId` itself can never be changed. */
  async updateOne(
    tenantId: string,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<number> {
    const res = await this.model
      .updateOne(this.scope(tenantId, filter), stripTenantId(update))
      .session(session ?? null)
      .exec();
    return res.matchedCount;
  }
}

function stripTenantId<T>(update: UpdateQuery<T>): UpdateQuery<T> {
  const copy: Record<string, unknown> = { ...update };
  delete copy.tenantId;
  for (const op of ["$set", "$setOnInsert", "$unset", "$rename"]) {
    const inner = copy[op];
    if (inner && typeof inner === "object") {
      const rest: Record<string, unknown> = { ...(inner as Record<string, unknown>) };
      delete rest.tenantId;
      copy[op] = rest;
    }
  }
  return copy as UpdateQuery<T>;
}
