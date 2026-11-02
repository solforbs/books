import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PERMISSIONS, myAccessResponseSchema } from "@books/shared";
import { addStaff, expectStatus, loginAs, ownerWithShop } from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { TestClient } from "../../../../test/test-client";

describe("GET /me/permissions (F02 §4.2, G1)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const access = async (client: TestClient) =>
    myAccessResponseSchema.parse(expectStatus(await client.get("/me/permissions"), 200).json());

  it("an owner has everything, and a one-person shop has no approvals (G1)", async () => {
    const { owner } = await ownerWithShop(t);
    expect(await access(owner)).toEqual({
      role: "owner",
      locationIds: [],
      permissions: [...PERMISSIONS],
      approvalsActive: false,
    });
  });

  it("approvers (owners, managers) keep approvals off; a cashier switches them on", async () => {
    const { owner, shop } = await ownerWithShop(t);
    await addStaff(owner, {
      name: "Mary Wanjiku",
      phone: randomPhone(),
      role: "manager",
      locationIds: [shop.id],
    });
    expect((await access(owner)).approvalsActive).toBe(false);

    const phone = randomPhone();
    const { member, temporaryPassword } = await addStaff(owner, {
      name: "Brian Otieno",
      phone,
      role: "cashier",
      locationIds: [shop.id],
      permissions: { give_discounts: false, see_cost_profit: true },
    });
    expect((await access(owner)).approvalsActive).toBe(true);

    const cashier = await loginAs(t, phone, temporaryPassword!);
    expect(await access(cashier)).toEqual({
      role: "cashier",
      locationIds: [shop.id],
      permissions: ["see_cost_profit", "sell", "receive_stock", "record_expenses"],
      approvalsActive: true,
    });

    // A switched-off cashier no longer counts.
    expectStatus(await owner.post(`/staff/${member.membershipId}/switch-off`), 200);
    expect((await access(owner)).approvalsActive).toBe(false);
  });

  it("needs a session with a business", async () => {
    expect((await new TestClient(t.app).get("/me/permissions")).statusCode).toBe(401);
  });
});
