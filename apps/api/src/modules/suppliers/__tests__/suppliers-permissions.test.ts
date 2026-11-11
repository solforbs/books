import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PermissionOverrides, Role, Supplier, SuppliersResponse } from "@books/shared";
import { expectStatus, type OwnerShop } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import { addSupplier, ownerWithShop, staffMember, supplierBody } from "./suppliers-fixtures";

interface Who {
  label: string;
  client: TestClient;
  read: boolean;
  manage: boolean;
  approve: boolean;
}

describe("who can do what with suppliers (F03 section 3, G1)", () => {
  let t: TestApp;
  let shop: OwnerShop;
  let people: Who[];
  let existing: Supplier;
  beforeAll(async () => {
    t = await createTestApp();
    shop = await ownerWithShop(t);
    existing = await addSupplier(shop.owner, "Existing Supplier Kitengela");
    const staff = async (role: Role, label: string, over: PermissionOverrides = {}) => ({
      label,
      client: (await staffMember(t, shop, role, over)).client,
    });
    people = [
      { label: "owner", client: shop.owner, read: true, manage: true, approve: true },
      { ...(await staff("manager", "manager")), read: true, manage: true, approve: true },
      { ...(await staff("cashier", "cashier")), read: true, manage: false, approve: false },
      {
        ...(await staff("cashier", "cashier without receive_stock", { receive_stock: false })),
        read: false,
        manage: false,
        approve: false,
      },
      { ...(await staff("storekeeper", "storekeeper")), read: true, manage: false, approve: false },
      { ...(await staff("accountant", "accountant")), read: false, manage: false, approve: false },
      {
        ...(await staff("storekeeper", "storekeeper with manage_suppliers", {
          manage_suppliers: true,
        })),
        read: true,
        manage: true,
        approve: false,
      },
    ];
  });
  afterAll(() => t.close());

  it("reads the list and one supplier only with manage_suppliers or receive_stock", async () => {
    for (const p of people) {
      const list = await p.client.get("/suppliers");
      const one = await p.client.get(`/suppliers/${existing.id}`);
      expect(list.statusCode, `${p.label} list`).toBe(p.read ? 200 : 403);
      expect(one.statusCode, `${p.label} get`).toBe(p.read ? 200 : 403);
      if (!p.read) expect(list.json().error.code).toBe("forbidden");
    }
  });

  it("creates, edits, hides and shows only with manage_suppliers", async () => {
    for (const p of people) {
      const create = await p.client.post(
        "/suppliers",
        supplierBody(`By ${p.label} ${Math.random()}`),
      );
      expect(create.statusCode, `${p.label} create`).toBe(p.manage ? 201 : 403);
      const wanted = p.manage ? 200 : 403;
      expect(
        (await p.client.patch(`/suppliers/${existing.id}`, { notes: p.label })).statusCode,
        `${p.label} patch`,
      ).toBe(wanted);
      expect(
        (await p.client.post(`/suppliers/${existing.id}/hide`)).statusCode,
        `${p.label} hide`,
      ).toBe(wanted);
      expect(
        (await p.client.post(`/suppliers/${existing.id}/unhide`)).statusCode,
        `${p.label} unhide`,
      ).toBe(wanted);
    }
  });

  it("the waiting list and approving need approve_items", async () => {
    for (const p of people) {
      const waiting = await p.client.get("/suppliers/waiting");
      expect(waiting.statusCode, `${p.label} waiting`).toBe(p.approve ? 200 : 403);
      const approve = await p.client.post(`/suppliers/${existing.id}/approve`, {
        phone: "0711000111",
      });
      // Everyone without approve_items is refused before the supplier is even looked at.
      expect(approve.statusCode === 403, `${p.label} approve refused`).toBe(!p.approve);
    }
  });

  it("people without manage_suppliers cannot send an empty or foreign request either", async () => {
    const storekeeper = people.find((p) => p.label === "storekeeper")!;
    expect((await storekeeper.client.post("/suppliers", {})).statusCode).toBe(403);
    expect((await storekeeper.client.patch("/suppliers/nope", {})).statusCode).toBe(403);
  });
});

describe("a new supplier typed while receiving goods (F03 section 9.10)", () => {
  let t: TestApp;
  let shop: OwnerShop;
  let storekeeper: TestClient;
  let manager: TestClient;
  beforeAll(async () => {
    t = await createTestApp();
    shop = await ownerWithShop(t);
    storekeeper = (await staffMember(t, shop, "storekeeper")).client;
    manager = (await staffMember(t, shop, "manager")).client;
  });
  afterAll(() => t.close());

  it("a solo shop never gets a waiting supplier: its owner is sent to the full form", async () => {
    const solo = await ownerWithShop(t);
    const res = await solo.owner.post("/suppliers/quick", { name: "Walk-in Supplier" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("use_full_form");
    expect(
      (await solo.owner.get("/suppliers/waiting")).json<SuppliersResponse>().suppliers,
    ).toEqual([]);
    const created = await addSupplier(solo.owner, "Walk-in Supplier");
    expect(created.status).toBe("active");
    expect(
      (await solo.owner.get("/suppliers/waiting")).json<SuppliersResponse>().suppliers,
    ).toEqual([]);
  });

  it("a storekeeper adds a name only; it is waiting, phoneless, cash and KES", async () => {
    const res = await storekeeper.post("/suppliers/quick", { name: "Mama Fatuma Accessories" });
    expect(res.statusCode).toBe(201);
    const { supplier } = res.json<{ supplier: Supplier }>();
    expect(supplier).toMatchObject({
      name: "Mama Fatuma Accessories",
      phone: null,
      status: "waiting",
      paymentRule: { type: "cash" },
      currency: "KES",
      isNeighbour: false,
    });
    // It can already be picked in the receiving screen, and sits in the managers' waiting list.
    const listed = (await storekeeper.get("/suppliers")).json<SuppliersResponse>().suppliers;
    expect(listed.map((s) => s.id)).toContain(supplier.id);
    const waiting = (await manager.get("/suppliers/waiting")).json<SuppliersResponse>().suppliers;
    expect(waiting.map((s) => s.id)).toEqual([supplier.id]);
  });

  it("a manager, or anyone with manage_suppliers, must use the full form", async () => {
    for (const client of [manager, shop.owner]) {
      const res = await client.post("/suppliers/quick", { name: "Should Use Form" });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("use_full_form");
    }
    const boosted = (await staffMember(t, shop, "storekeeper", { manage_suppliers: true })).client;
    expect((await boosted.post("/suppliers/quick", { name: "Should Use Form" })).statusCode).toBe(
      400,
    );
  });

  it("refuses people who cannot receive stock, and bad names", async () => {
    const accountant = (await staffMember(t, shop, "accountant")).client;
    const noReceive = (await staffMember(t, shop, "cashier", { receive_stock: false })).client;
    for (const client of [accountant, noReceive]) {
      const res = await client.post("/suppliers/quick", { name: "Not Allowed Traders" });
      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe("forbidden");
    }
    expect((await storekeeper.post("/suppliers/quick", { name: "x" })).statusCode).toBe(400);
    expect((await storekeeper.post("/suppliers/quick", {})).statusCode).toBe(400);
  });

  it("quick add also warns about similar names until acknowledged", async () => {
    const warn = await storekeeper.post("/suppliers/quick", { name: "mama fatuma accessories" });
    expect(warn.statusCode).toBe(409);
    expect(warn.json().error.code).toBe("similar_suppliers");
    expect(warn.json().error.details.suppliers).toHaveLength(1);
    const ok = await storekeeper.post("/suppliers/quick", {
      name: "mama fatuma accessories",
      acknowledgeSimilar: true,
    });
    expect(ok.statusCode).toBe(201);
  });

  it("a manager approves it after adding the phone; then it is active and off the waiting list", async () => {
    const quick = (await storekeeper.post("/suppliers/quick", { name: "Kariakor Chargers" })).json<{
      supplier: Supplier;
    }>().supplier;
    const none = await manager.post(`/suppliers/${quick.id}/approve`, {});
    expect(none.statusCode).toBe(400);
    expect(none.json().error.code).toBe("phone_required");
    expect(
      (await storekeeper.post(`/suppliers/${quick.id}/approve`, { phone: "0722111222" }))
        .statusCode,
    ).toBe(403);

    const res = await manager.post(`/suppliers/${quick.id}/approve`, {
      phone: "0722 111 222",
      paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
      currency: "USD",
      marketOrLocation: "Kariakor",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ supplier: Supplier }>().supplier).toMatchObject({
      id: quick.id,
      status: "active",
      phone: "+254722111222",
      currency: "USD",
      marketOrLocation: "Kariakor",
      paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
      addedBy: { id: quick.addedBy.id },
    });
    const waiting = (await manager.get("/suppliers/waiting")).json<SuppliersResponse>().suppliers;
    expect(waiting.map((s) => s.id)).not.toContain(quick.id);
    const second = await manager.post(`/suppliers/${quick.id}/approve`, { phone: "0722111222" });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe("not_waiting");
    const audit = await t.sql<{ details: unknown }>(
      "select details from audit_log where action = 'supplier_approved' and tenant_id = $1 and target_id = $2",
      [shop.tenantId, quick.id],
    );
    expect(audit[0]!.details).toMatchObject({
      before: { status: "waiting" },
      after: { status: "active" },
    });
    expect(JSON.stringify(audit)).not.toContain("722111222");
  });

  it("approving a phone that another supplier has is refused, and the supplier stays waiting", async () => {
    const taken = await addSupplier(shop.owner, "Phone Holder Ruiru");
    const quick = (
      await storekeeper.post("/suppliers/quick", { name: "Ruiru Newcomer Stall" })
    ).json<{
      supplier: Supplier;
    }>().supplier;
    const res = await manager.post(`/suppliers/${quick.id}/approve`, { phone: taken.phone });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatchObject({
      code: "supplier_phone_exists",
      details: { existingId: taken.id, existingName: "Phone Holder Ruiru" },
    });
    const after = (await manager.get(`/suppliers/${quick.id}`)).json<{ supplier: Supplier }>()
      .supplier;
    expect(after).toMatchObject({ status: "waiting", phone: null });
  });

  it("approving may fix the name, which runs the similar-name check again", async () => {
    const quick = (
      await storekeeper.post("/suppliers/quick", { name: "Rongai Spares Mart" })
    ).json<{
      supplier: Supplier;
    }>().supplier;
    await addSupplier(shop.owner, "Kiserian Parts Depot");
    const warn = await manager.post(`/suppliers/${quick.id}/approve`, {
      phone: "0700123123",
      name: "Kiserian Parts Depot",
    });
    expect(warn.json().error.code).toBe("similar_suppliers");
    const ok = await manager.post(`/suppliers/${quick.id}/approve`, {
      phone: "0700123123",
      name: "Kiserian Parts Depot",
      acknowledgeSimilar: true,
    });
    expect(ok.json<{ supplier: Supplier }>().supplier).toMatchObject({
      name: "Kiserian Parts Depot",
      status: "active",
    });
  });

  it("an active or hidden supplier cannot be approved; unknown ids are 404", async () => {
    const active = await addSupplier(shop.owner, "Already Active Mart");
    const res = await manager.post(`/suppliers/${active.id}/approve`, { phone: "0711999888" });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("not_waiting");
    expectStatus(await manager.post(`/suppliers/${active.id}/hide`), 200);
    expect(
      (await manager.post(`/suppliers/${active.id}/approve`, { phone: "0711999888" })).json().error
        .code,
    ).toBe("not_waiting");
    expect(
      (
        await manager.post("/suppliers/00000000-0000-4000-8000-000000000000/approve", {
          phone: "0711999888",
        })
      ).statusCode,
    ).toBe(404);
  });

  it("someone given approve_items can approve without being able to edit suppliers", async () => {
    const lead = (await staffMember(t, shop, "storekeeper", { approve_items: true })).client;
    const quick = (
      await storekeeper.post("/suppliers/quick", { name: "Githurai Cables Corner" })
    ).json<{
      supplier: Supplier;
    }>().supplier;
    expect(
      (await lead.post(`/suppliers/${quick.id}/approve`, { phone: "0788555444" })).statusCode,
    ).toBe(200);
    expect((await lead.patch(`/suppliers/${quick.id}`, { notes: "x" })).statusCode).toBe(403);
  });

  it("hiding a waiting supplier and showing it again returns it to waiting", async () => {
    const quick = (
      await storekeeper.post("/suppliers/quick", { name: "Limuru Odd Jobs Supply" })
    ).json<{
      supplier: Supplier;
    }>().supplier;
    const hidden = await manager.post(`/suppliers/${quick.id}/hide`);
    expect(hidden.json<{ supplier: Supplier }>().supplier.status).toBe("hidden");
    const back = await manager.post(`/suppliers/${quick.id}/unhide`);
    expect(back.json<{ supplier: Supplier }>().supplier.status).toBe("waiting");
  });
});
