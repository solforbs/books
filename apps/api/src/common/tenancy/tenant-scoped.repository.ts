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

  /** Returns the number of matched documents. Throws if the update would touch `tenantId`. */
  async updateOne(
    tenantId: string,
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    session?: ClientSession,
  ): Promise<number> {
    assertTenantIdUntouched(update);
    const res = await this.model
      .updateOne(this.scope(tenantId, filter), update)
      .session(session ?? null)
      .exec();
    return res.matchedCount;
  }
}

const touchesTenantId = (path: string) => path === "tenantId" || path.startsWith("tenantId.");

/**
 * Refuses (rather than silently drops) any update that could change which
 * business a document belongs to: a `tenantId` / `tenantId.*` path under any
 * operator ($set, $unset, $inc, $min, $max, $currentDate, $push, $addToSet,
 * $setOnInsert, ...), a `$rename` to or from it, a bare replacement field, or
 * an aggregation-pipeline update (too expressive to check safely).
 */
export function assertTenantIdUntouched(update: unknown): void {
  if (Array.isArray(update)) {
    throw new Error("Pipeline updates are not allowed on tenant-scoped data");
  }
  for (const [key, value] of Object.entries((update ?? {}) as Record<string, unknown>)) {
    if (!key.startsWith("$")) {
      if (touchesTenantId(key)) throw new Error("tenantId cannot be changed");
      continue;
    }
    if (!value || typeof value !== "object") continue;
    for (const [path, arg] of Object.entries(value as Record<string, unknown>)) {
      const renamesInto = key === "$rename" && typeof arg === "string" && touchesTenantId(arg);
      if (touchesTenantId(path) || renamesInto) throw new Error("tenantId cannot be changed");
    }
  }
}
