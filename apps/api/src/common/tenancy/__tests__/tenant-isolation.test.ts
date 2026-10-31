import { randomBytes } from "node:crypto";
import mongoose, { Schema, Types, type Connection, type Model } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inject } from "vitest";
import { cents, type Cents } from "@books/shared";
import { TenantScopedRepository, type TenantOwned } from "../tenant-scoped.repository";

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

  it("updateOne cannot touch another tenant's document nor move a document between tenants", async () => {
    const matched = await repo.updateOne(
      tenantA,
      { _id: widgetB._id },
      { $set: { name: "hacked" } },
    );
    expect(matched).toBe(0);
    expect((await repo.findById(tenantB, widgetB._id.toHexString()))?.name).toBe("B phone");

    await repo.updateOne(
      tenantB,
      { _id: widgetB._id },
      { $set: { tenantId: new Types.ObjectId(tenantA), name: "renamed" } },
    );
    const after = await repo.findById(tenantB, widgetB._id.toHexString());
    expect(after?.name).toBe("renamed");
    expect(after?.tenantId.toHexString()).toBe(tenantB);
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
