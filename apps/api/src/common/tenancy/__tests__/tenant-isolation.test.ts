import { randomBytes } from "node:crypto";
import mongoose, { Schema, Types, type Connection, type Model } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inject } from "vitest";
import { cents, type Cents } from "@books/shared";
import {
  TenantScopedRepository,
  assertTenantIdUntouched,
  type TenantOwned,
} from "../tenant-scoped.repository";

interface WidgetDoc extends TenantOwned {
  name: string;
  priceCents: Cents;
}

const widgetSchema = new Schema<WidgetDoc>({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  priceCents: { type: Number, required: true, validate: Number.isSafeInteger },
});

class WidgetRepository extends TenantScopedRepository<WidgetDoc> {
  constructor(model: Model<WidgetDoc>) {
    super(model);
  }
}

describe("TenantScopedRepository: one business can never see another's data", () => {
  let conn: Connection;
  let repo: WidgetRepository;
  const tenantA = new Types.ObjectId().toHexString();
  const tenantB = new Types.ObjectId().toHexString();
  let widgetB: WidgetDoc;

  beforeAll(async () => {
    const url = new URL(inject("mongoUri"));
    url.pathname = `/tenancy_${randomBytes(6).toString("hex")}`;
    conn = await mongoose.createConnection(url.toString()).asPromise();
    repo = new WidgetRepository(conn.model<WidgetDoc>("Widget", widgetSchema));
    await repo.create(tenantA, { name: "A phone", priceCents: cents(1_250_050) });
    widgetB = await repo.create(tenantB, { name: "B phone", priceCents: cents(999_900) });
  });
  afterAll(async () => {
    await conn.dropDatabase();
    await conn.close();
  });

  it("stamps the tenant on create and stores money as integer cents", async () => {
    expect(widgetB.tenantId.toHexString()).toBe(tenantB);
    expect(widgetB.priceCents).toBe(999_900);
  });

  it("findById cannot fetch another tenant's document", async () => {
    const id = widgetB._id.toHexString();
    expect(await repo.findById(tenantA, id)).toBeNull();
    expect((await repo.findById(tenantB, id))?.name).toBe("B phone");
  });

  it("find, findOne and count only see the caller's tenant", async () => {
    expect((await repo.find(tenantA)).map((w) => w.name)).toEqual(["A phone"]);
    expect(await repo.findOne(tenantA, { name: "B phone" })).toBeNull();
    expect(await repo.count(tenantA)).toBe(1);
  });

  it("a tenantId smuggled into the filter is overridden", async () => {
    const smuggled = { tenantId: new Types.ObjectId(tenantB) };
    expect(await repo.find(tenantA, smuggled)).toHaveLength(1);
    expect((await repo.find(tenantA, smuggled))[0]!.name).toBe("A phone");
    expect(await repo.findOne(tenantA, { name: "B phone", ...smuggled })).toBeNull();
  });

  it("updateOne cannot touch another tenant's document", async () => {
    const matched = await repo.updateOne(
      tenantA,
      { _id: widgetB._id },
      { $set: { name: "hacked" } },
    );
    expect(matched).toBe(0);
    expect((await repo.findById(tenantB, widgetB._id.toHexString()))?.name).toBe("B phone");
  });

  const otherTenant = new Types.ObjectId(tenantA);
  it.each([
    ["$set", { $set: { tenantId: otherTenant, name: "moved" } }],
    ["$set dotted path", { $set: { "tenantId.x": 1 } }],
    ["bare field", { tenantId: otherTenant }],
    ["$unset", { $unset: { tenantId: "" } }],
    ["$rename from tenantId", { $rename: { tenantId: "oldTenant" } }],
    ["$rename into tenantId", { $rename: { name: "tenantId" } }],
    ["$rename into tenantId.*", { $rename: { name: "tenantId.sub" } }],
    ["$setOnInsert", { $setOnInsert: { tenantId: otherTenant } }],
    ["$min", { $min: { tenantId: otherTenant } }],
    ["$max", { $max: { tenantId: otherTenant } }],
    ["$currentDate", { $currentDate: { tenantId: true } }],
    ["$push", { $push: { tenantId: otherTenant } }],
    ["$addToSet", { $addToSet: { "tenantId.list": 1 } }],
    ["$inc", { $inc: { tenantId: 1 } }],
  ])("updateOne refuses an update touching tenantId via %s", async (_, update) => {
    await expect(repo.updateOne(tenantB, { _id: widgetB._id }, update as never)).rejects.toThrow(
      "tenantId cannot be changed",
    );
    const after = await repo.findById(tenantB, widgetB._id.toHexString());
    expect(after?.tenantId.toHexString()).toBe(tenantB);
    expect(after?.name).toBe("B phone");
  });

  it("updateOne refuses aggregation-pipeline updates", async () => {
    const pipeline = [{ $set: { tenantId: otherTenant } }];
    await expect(repo.updateOne(tenantB, { _id: widgetB._id }, pipeline as never)).rejects.toThrow(
      "Pipeline updates are not allowed",
    );
    const after = await repo.findById(tenantB, widgetB._id.toHexString());
    expect(after?.tenantId.toHexString()).toBe(tenantB);
  });

  it("updateOne still allows ordinary updates of the caller's own document", async () => {
    const matched = await repo.updateOne(
      tenantB,
      { _id: widgetB._id },
      { $set: { name: "renamed" }, $inc: { priceCents: 100 } },
    );
    expect(matched).toBe(1);
    const after = await repo.findById(tenantB, widgetB._id.toHexString());
    expect(after?.name).toBe("renamed");
    expect(after?.tenantId.toHexString()).toBe(tenantB);
    await repo.updateOne(tenantB, { _id: widgetB._id }, { $set: { name: "B phone" } });
    // Only the exact field and its sub-paths are guarded, not look-alike names.
    expect(() => assertTenantIdUntouched({ $set: { tenantIdNote: "x" } })).not.toThrow();
  });

  it("refuses to run without a valid tenantId", async () => {
    await expect(repo.find("")).rejects.toThrow("tenantId is required");
    await expect(repo.count("not-an-id")).rejects.toThrow("tenantId is required");
  });

  it("has no delete method (G4: nothing is deleted)", () => {
    expect("deleteOne" in repo).toBe(false);
    expect("deleteMany" in repo).toBe(false);
  });
});
