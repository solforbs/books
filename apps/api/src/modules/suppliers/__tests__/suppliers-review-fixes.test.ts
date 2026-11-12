import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Supplier, SuppliersResponse } from "@books/shared";
import { expectStatus, type OwnerShop } from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import { createCategory } from "../../catalog/__tests__/catalog-fixtures";
import { addSupplier, ownerWithShop, staffMember, supplierBody } from "./suppliers-fixtures";

const quickAdd = async (client: TestClient, name: string) =>
  expectStatus(await client.post("/suppliers/quick", { name }), 201).json<{ supplier: Supplier }>()
    .supplier;

/** Regression tests for the S2a security review. */
describe("S2a review fixes", () => {
  let t: TestApp;
  let shop: OwnerShop;
  beforeAll(async () => {
    t = await createTestApp();
    shop = await ownerWithShop(t);
  });
  afterAll(() => t.close());

  it("T8: a Kenyan number written +2540... is the same phone as +254...; broken +254 forms are refused", async () => {
    const phone = randomPhone();
    const first = await addSupplier(shop.owner, "Trunk Zero Spares", {
      phone: `+254${phone.slice(1)}`,
    });
    const trunk = `+2540${phone.slice(1)}`;
    const clash = await shop.owner.post(
      "/suppliers",
      supplierBody("Other Name Entirely", { phone: trunk }),
    );
    expect(clash.statusCode).toBe(409);
    expect(clash.json().error).toMatchObject({
      code: "supplier_phone_exists",
      details: { existingId: first.id },
    });
    const other = await addSupplier(shop.owner, "Unrelated Wholesale Kisumu");
    const patch = await shop.owner.patch(`/suppliers/${other.id}`, { phone: trunk });
    expect(patch.json().error.code).toBe("supplier_phone_exists");
    const cashier = await staffMember(t, shop, "cashier");
    const waiting = await quickAdd(cashier.client, "Waiting Gadget Hub");
    const approve = await shop.owner.post(`/suppliers/${waiting.id}/approve`, { phone: trunk });
    expect(approve.json().error.code).toBe("supplier_phone_exists");
    const bad = await shop.owner.post(
      "/suppliers",
      supplierBody("Bad Kenyan Form", { phone: "+25471234567" }),
    );
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe("validation_failed");
  });

  it("a forged cursor is a 400 invalid_cursor on both lists", async () => {
    const forge = (parts: unknown[]) => Buffer.from(JSON.stringify(parts)).toString("base64url");
    const bad = [
      forge(["alpha", "not-a-uuid"]),
      forge(["al\u0000pha", "7b0d2a54-3c9e-4f1a-8d6b-0a1b2c3d4e5f"]),
    ];
    for (const cursor of bad) {
      for (const path of ["/suppliers", "/suppliers/waiting"]) {
        const res = await shop.owner.get(`${path}?cursor=${cursor}`);
        expect(res.statusCode, path).toBe(400);
        expect(res.json().error.code).toBe("invalid_cursor");
      }
    }
  });

  it("a waiting supplier cannot be hidden; a hide records the real previous status", async () => {
    const cashier = await staffMember(t, shop, "cashier");
    const waiting = await quickAdd(cashier.client, "Queue Protected Traders");
    const refused = await shop.owner.post(`/suppliers/${waiting.id}/hide`);
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe("supplier_not_active");
    const queue = (await shop.owner.get("/suppliers/waiting")).json<SuppliersResponse>();
    expect(queue.suppliers.map((s) => s.id)).toContain(waiting.id);

    const active = await addSupplier(shop.owner, "Hide Audit Wholesale");
    expectStatus(await shop.owner.post(`/suppliers/${active.id}/hide`), 200);
    const rows = await t.sql<{ details: { before: { status: string } } }>(
      "select details from audit_log where action = 'supplier_hidden' and tenant_id = $1 and target_id = $2",
      [shop.tenantId, active.id],
    );
    expect(rows[0]!.details.before.status).toBe("active");
  });

  it("a NUL character in any text field is a 400 validation_failed, not a 500", async () => {
    const nul = "Bad\u0000Name";
    const supplier = await shop.owner.post("/suppliers", supplierBody(nul));
    expect(supplier.statusCode).toBe(400);
    expect(supplier.json().error.code).toBe("validation_failed");
    const note = await shop.owner.post(
      "/suppliers",
      supplierBody("Note Nul Traders", { notes: "a\u0000b" }),
    );
    expect(note.statusCode).toBe(400);
    const category = await shop.owner.post("/product-categories", { name: nul });
    expect(category.statusCode).toBe(400);
    expect(category.json().error.code).toBe("validation_failed");
    const cat = await createCategory(shop.owner, { name: "Nul Cat" });
    const product = await shop.owner.post("/products", {
      categoryId: cat.id,
      name: nul,
      retailPrice: 1000,
    });
    expect(product.statusCode).toBe(400);
    expect(product.json().error.code).toBe("validation_failed");
  });
});

describe("S2a: receive-only staff see a reduced supplier (central view)", () => {
  let t: TestApp;
  let shop: OwnerShop;
  beforeAll(async () => {
    t = await createTestApp();
    shop = await ownerWithShop(t);
  });
  afterAll(() => t.close());

  const REDUCED = ["id", "name", "phone", "paymentRule", "status", "addedBy", "createdAt"].sort();
  const HIDDEN = ["currency", "isNeighbour", "kraPin", "notes", "marketOrLocation"];

  it("every endpoint, including 409 details, leaves the private fields out", async () => {
    const full = await addSupplier(shop.owner, "Full Detail Imports", {
      phone: "+971501234567",
      currency: "USD",
      isNeighbour: true,
      kraPin: "A123456789Z",
      notes: "private note",
      marketOrLocation: "Dubai",
    });
    const keeper = (await staffMember(t, shop, "storekeeper")).client;
    const keys = (s: Supplier) => Object.keys(s).sort();

    const one = (await keeper.get(`/suppliers/${full.id}`)).json<{ supplier: Supplier }>().supplier;
    expect(keys(one)).toEqual(REDUCED);
    expect(one.name).toBe("Full Detail Imports");
    const list = (await keeper.get("/suppliers")).json<SuppliersResponse>();
    expect(list.suppliers.length).toBeGreaterThan(0);
    for (const s of list.suppliers) expect(keys(s)).toEqual(REDUCED);

    const quick = await quickAdd(keeper, "Totally New Stall");
    expect(keys(quick)).toEqual(REDUCED);
    const similar = await keeper.post("/suppliers/quick", { name: "Full Detail Imports Ltd" });
    expect(similar.json().error.code).toBe("similar_suppliers");
    for (const s of similar.json().error.details.suppliers as Supplier[]) {
      expect(keys(s)).toEqual(REDUCED);
    }
    const text = JSON.stringify([one, list, quick, similar.json()]);
    for (const secret of ["A123456789Z", "private note", "Dubai"]) {
      expect(text).not.toContain(secret);
    }
    for (const key of HIDDEN) expect(text).not.toContain(`"${key}"`);

    // People who manage or approve still see everything, in every response.
    const owner = (await shop.owner.get(`/suppliers/${full.id}`)).json<{ supplier: Supplier }>()
      .supplier;
    expect(owner).toMatchObject({
      currency: "USD",
      isNeighbour: true,
      kraPin: "A123456789Z",
      notes: "private note",
    });
    const ownerSimilar = await shop.owner.post(
      "/suppliers",
      supplierBody("Full Detail Imports Ltd"),
    );
    expect(ownerSimilar.json().error.details.suppliers[0]).toMatchObject({
      currency: "USD",
      kraPin: "A123456789Z",
    });
    const manager = (await staffMember(t, shop, "manager")).client;
    const waiting = (await manager.get("/suppliers/waiting")).json<SuppliersResponse>();
    expect(waiting.suppliers.length).toBeGreaterThan(0);
    expect(waiting.suppliers[0]).toHaveProperty("currency");
  });
});
