import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { businessResponseSchema } from "@books/shared";
import {
  addStaff,
  expectStatus,
  firstLogin,
  ownerWithShop,
} from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { auditLog } from "../../audit/infrastructure/audit-log.table";

describe("business details (F02 'Business details for documents', G3)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("starts with just the name; KRA PIN empty and VAT off", async () => {
    const { owner, tenantId } = await ownerWithShop(t);
    const body = businessResponseSchema.parse(
      expectStatus(await owner.get("/business"), 200).json(),
    );
    expect(body.business).toMatchObject({
      id: tenantId,
      name: "Nuru Electronics",
      address: null,
      phone: null,
      email: null,
      kraPin: null,
      footerNote: null,
      vatEnabled: false,
    });
  });

  it("saves the details, normalising phone, email and KRA PIN; audits with the phone masked", async () => {
    const { owner, tenantId } = await ownerWithShop(t);
    const res = await owner.put("/business", {
      name: "Nuru Phones",
      address: "Luthuli Avenue, Shop 12",
      phone: "0712 345 678",
      email: "Info@Nuru.co.ke",
      kraPin: "a123456789b",
      footerNote: "Goods once sold are not returnable without receipt",
      vatEnabled: true,
    });
    expect(expectStatus(res, 200).json().business).toMatchObject({
      name: "Nuru Phones",
      phone: "+254712345678",
      email: "info@nuru.co.ke",
      kraPin: "A123456789B",
      vatEnabled: true,
    });
    // Left out = unchanged; "" = cleared.
    const partial = await owner.put("/business", {
      name: "Nuru Phones",
      vatEnabled: true,
      kraPin: "",
    });
    expect(partial.json().business).toMatchObject({
      address: "Luthuli Avenue, Shop 12",
      kraPin: null,
    });
    // The session's business name follows.
    expect((await owner.get("/auth/me")).json().memberships[0].businessName).toBe("Nuru Phones");

    const [entry] = await t.db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.action, "business_updated"), eq(auditLog.tenantId, tenantId)));
    expect(JSON.stringify(entry!.details)).not.toContain("+254712345678");
    expect(entry!.details).toMatchObject({ after: { phone: "+254******678" } });
  });

  it("rejects a malformed KRA PIN and phone", async () => {
    const { owner } = await ownerWithShop(t);
    for (const bad of [{ kraPin: "123" }, { phone: "12345" }, { email: "nope" }]) {
      const res = await owner.put("/business", { name: "Nuru", vatEnabled: false, ...bad });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("validation_failed");
    }
  });

  it("staff can read the details but not change them", async () => {
    const { owner, shop } = await ownerWithShop(t);
    const phone = randomPhone();
    const { temporaryPassword } = await addStaff(owner, {
      name: "Brian Otieno",
      phone,
      role: "manager",
      locationIds: [shop.id],
    });
    const manager = await firstLogin(t, phone, temporaryPassword!);
    expectStatus(await manager.get("/business"), 200);
    const res = await manager.put("/business", { name: "Mine", vatEnabled: false });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("forbidden");
  });
});
