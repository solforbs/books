import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { MoneyPlace } from "@books/shared";
import {
  addStaff,
  createLocation,
  expectStatus,
  firstLogin,
  ownerWithShop,
  type OwnerShop,
} from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import { auditLog } from "../../audit/infrastructure/audit-log.table";
import { MoneyPlaceBalanceProbe } from "../application/contents-probes";

describe("money places (F02 §3, T3)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const create = async (client: TestClient, body: Record<string, unknown>) =>
    expectStatus(await client.post("/money-places", body), 201).json<{ moneyPlace: MoneyPlace }>()
      .moneyPlace;
  const list = async (client: TestClient) =>
    expectStatus(await client.get("/money-places"), 200).json<{ moneyPlaces: MoneyPlace[] }>()
      .moneyPlaces;

  /** Shop 1 + Shop 2, a Till shared by both, a bank only at Shop 1, and a Shop 2 cashier. */
  async function setup() {
    const biz: OwnerShop = await ownerWithShop(t);
    const shop2 = await createLocation(biz.owner, { name: "Shop 2", type: "shop" });
    const till = await create(biz.owner, {
      type: "mpesa_till",
      name: "Till",
      number: "123456",
      locationIds: [biz.shop.id, shop2.id],
    });
    const bank = await create(biz.owner, {
      type: "bank",
      name: "Equity",
      number: "0123-456",
      locationIds: [biz.shop.id],
    });
    const phone = randomPhone();
    const { temporaryPassword } = await addStaff(biz.owner, {
      name: "Brian Otieno",
      phone,
      role: "cashier",
      locationIds: [shop2.id],
    });
    const cashier = await firstLogin(t, phone, temporaryPassword!);
    return { ...biz, shop2, till, bank, cashier };
  }

  it("T3: a shared Till shows at both shops; a bank linked to Shop 1 only there", async () => {
    const s = await setup();
    expect(s.till.locationIds.sort()).toEqual([s.shop.id, s.shop2.id].sort());
    const ownerView = await list(s.owner);
    // Two drawers (one per shop) + till + bank.
    expect(ownerView.map((p) => p.type).sort()).toEqual(
      ["bank", "cash_drawer", "cash_drawer", "mpesa_till"].sort(),
    );

    const cashierView = await list(s.cashier);
    expect(cashierView.map((p) => p.id).sort()).toEqual([s.till.id, s.shop2.cashDrawerId!].sort());
    // Links to locations the cashier cannot see are not revealed.
    expect(cashierView.find((p) => p.id === s.till.id)!.locationIds).toEqual([s.shop2.id]);
  });

  it("validates settlesToId: only a bank of this business (invalid_settles_to)", async () => {
    const s = await setup();
    const other = await ownerWithShop(t);
    const otherBank = await create(other.owner, {
      type: "bank",
      name: "KCB",
      locationIds: [other.shop.id],
    });
    const paybill = { type: "mpesa_paybill", name: "Paybill", locationIds: [s.shop.id] };
    for (const settlesToId of [s.till.id, otherBank.id, "00000000-0000-4000-8000-000000000000"]) {
      const res = await s.owner.post("/money-places", { ...paybill, settlesToId });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("invalid_settles_to");
    }
    const ok = await create(s.owner, { ...paybill, number: "222111", settlesToId: s.bank.id });
    expect(ok.settlesToId).toBe(s.bank.id);
    // A bank or safe does not settle anywhere; a place never settles to itself.
    const safe = await s.owner.post("/money-places", {
      type: "safe",
      name: "Safe",
      settlesToId: s.bank.id,
      locationIds: [s.shop.id],
    });
    expect(safe.json().error.code).toBe("invalid_settles_to");
    const self = await s.owner.patch(`/money-places/${ok.id}`, { settlesToId: ok.id });
    expect(self.json().error.code).toBe("invalid_settles_to");
  });

  it("a manager only settles to a bank linked to one of their locations", async () => {
    const s = await setup();
    const shop2Bank = await create(s.owner, {
      type: "bank",
      name: "Co-op",
      locationIds: [s.shop2.id],
    });
    const phone = randomPhone();
    const m = await addStaff(s.owner, {
      name: "Mary Wanjiku",
      phone,
      role: "manager",
      locationIds: [s.shop2.id],
    });
    const manager = await firstLogin(t, phone, m.temporaryPassword);
    const paybill = { type: "mpesa_paybill", name: "Paybill", locationIds: [s.shop2.id] };
    const hidden = await manager.post("/money-places", { ...paybill, settlesToId: s.bank.id });
    expect(hidden.statusCode).toBe(400);
    expect(hidden.json().error.code).toBe("invalid_settles_to");
    const ok = await create(manager, { ...paybill, settlesToId: shop2Bank.id });
    const moved = await manager.patch(`/money-places/${ok.id}`, { settlesToId: s.bank.id });
    expect(moved.json().error.code).toBe("invalid_settles_to");
    // The owner sees every location, so any bank of the business.
    expectStatus(await s.owner.patch(`/money-places/${ok.id}`, { settlesToId: s.bank.id }), 200);
  });

  it("audits the full business number and settlesToId on create and update", async () => {
    const s = await setup();
    const paybill = await create(s.owner, {
      type: "mpesa_paybill",
      name: "Paybill",
      number: "400200",
      settlesToId: s.bank.id,
      locationIds: [s.shop.id],
    });
    expectStatus(await s.owner.patch(`/money-places/${paybill.id}`, { number: "400300" }), 200);
    const details = async (action: string) =>
      (
        await t.db
          .select()
          .from(auditLog)
          .where(and(eq(auditLog.action, action), eq(auditLog.targetId, paybill.id)))
      )[0]!.details;
    expect(await details("money_place_created")).toMatchObject({
      after: { number: "400200", settlesToId: s.bank.id },
    });
    expect(await details("money_place_updated")).toMatchObject({
      before: { number: "400200", settlesToId: s.bank.id },
      after: { number: "400300", settlesToId: s.bank.id },
    });
  });

  it("needs at least one usable location; M-Pesa numbers are digits", async () => {
    const s = await setup();
    const base = { type: "mpesa_till", name: "Till 2" };
    const none = await s.owner.post("/money-places", { ...base, locationIds: [] });
    expect(none.json().error.code).toBe("validation_failed");
    const foreign = await s.owner.post("/money-places", { ...base, locationIds: [randomUUID()] });
    expect(foreign.statusCode).toBe(400);
    expect(foreign.json().error.code).toBe("location_not_found");
    const letters = await s.owner.post("/money-places", {
      ...base,
      number: "12AB",
      locationIds: [s.shop.id],
    });
    expect(letters.json().error.code).toBe("validation_failed");
    const drawer = await s.owner.post("/money-places", {
      type: "cash_drawer",
      name: "Extra drawer",
      locationIds: [s.shop.id],
    });
    expect(drawer.json().error.code).toBe("validation_failed");
  });

  it("a cash drawer stays with its location: only its name can change", async () => {
    const s = await setup();
    const id = s.shop.cashDrawerId!;
    const relink = await s.owner.patch(`/money-places/${id}`, { locationIds: [s.shop2.id] });
    expect(relink.statusCode).toBe(403);
    expect(relink.json().error.code).toBe("forbidden");
    expectStatus(await s.owner.patch(`/money-places/${id}`, { name: "Front counter" }), 200);
  });

  it("relinks and hides a place; hiding needs a zero balance (money_place_not_empty)", async () => {
    const s = await setup();
    const moved = expectStatus(
      await s.owner.patch(`/money-places/${s.bank.id}`, { locationIds: [s.shop2.id] }),
      200,
    ).json<{ moneyPlace: MoneyPlace }>().moneyPlace;
    expect(moved.locationIds).toEqual([s.shop2.id]);

    const spy = vi.spyOn(t.app.get(MoneyPlaceBalanceProbe), "balanceOf").mockResolvedValue(500);
    try {
      const res = await s.owner.patch(`/money-places/${s.bank.id}`, { hidden: true });
      expect(res.json().error).toMatchObject({
        code: "money_place_not_empty",
        details: { balanceCents: 500 },
      });
    } finally {
      spy.mockRestore();
    }
    const hidden = await s.owner.patch(`/money-places/${s.bank.id}`, { hidden: true });
    expect(hidden.json().moneyPlace.hidden).toBe(true);
    expect((await list(s.cashier)).some((p) => p.id === s.bank.id)).toBe(false);
    // The owner still sees it (hidden: true) and can show it again.
    expect((await list(s.owner)).find((p) => p.id === s.bank.id)?.hidden).toBe(true);
    const shown = await s.owner.patch(`/money-places/${s.bank.id}`, { hidden: false });
    expect(shown.json().moneyPlace.hidden).toBe(false);
    expect((await list(s.cashier)).some((p) => p.id === s.bank.id)).toBe(true);
  });

  it("cashiers cannot add or change money places; unknown ids are not found", async () => {
    const s = await setup();
    const add = await s.cashier.post("/money-places", {
      type: "safe",
      name: "Safe",
      locationIds: [s.shop2.id],
    });
    expect(add.statusCode).toBe(403);
    const other = await ownerWithShop(t);
    const res = await other.owner.patch(`/money-places/${s.till.id}`, { name: "Mine" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("money_place_not_found");
  });

  it("a manager editing links keeps the links to locations they cannot see", async () => {
    const s = await setup();
    const shop3 = await createLocation(s.owner, { name: "Shop 3", type: "shop" });
    const phone = randomPhone();
    const { temporaryPassword } = await addStaff(s.owner, {
      name: "Mary Wanjiku",
      phone,
      role: "manager",
      locationIds: [s.shop2.id, shop3.id],
    });
    const manager = await firstLogin(t, phone, temporaryPassword!);
    const res = await manager.patch(`/money-places/${s.till.id}`, { locationIds: [shop3.id] });
    expect(res.json().moneyPlace.locationIds).toEqual([shop3.id]);
    const ownerView = (await list(s.owner)).find((p) => p.id === s.till.id)!;
    expect(ownerView.locationIds.sort()).toEqual([s.shop.id, shop3.id].sort());
  });
});
