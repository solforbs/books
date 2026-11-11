import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PaymentRule, Supplier } from "@books/shared";
import { expectStatus, type OwnerShop } from "../../../../test/business-fixtures";
import { e164, randomPhone } from "../../../../test/fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { addSupplier, ownerWithShop, supplierBody } from "./suppliers-fixtures";

const RULES: PaymentRule[] = [
  { type: "cash" },
  { type: "within_time", period: { value: 2, unit: "weeks" } },
  { type: "pay_as_you_sell" },
  { type: "pay_after_all_sold" },
  { type: "after_sold_with_latest_date", period: { value: 3, unit: "months" } },
];

describe("adding and editing suppliers (F03 sections 2.1, 3, 4)", () => {
  let t: TestApp;
  let shop: OwnerShop;
  beforeAll(async () => {
    t = await createTestApp();
    shop = await ownerWithShop(t);
  });
  afterAll(() => t.close());

  it("creates an active supplier with the defaults: cash, KES, not a neighbour, no KRA PIN", async () => {
    const phone = randomPhone();
    const res = await shop.owner.post("/suppliers", { name: "Mama Njeri Gadgets", phone });
    expect(res.statusCode).toBe(201);
    const { supplier } = res.json<{ supplier: Supplier }>();
    expect(supplier).toMatchObject({
      name: "Mama Njeri Gadgets",
      phone: e164(phone),
      paymentRule: { type: "cash" },
      currency: "KES",
      isNeighbour: false,
      kraPin: null,
      marketOrLocation: null,
      notes: null,
      status: "active",
      addedBy: { id: shop.ownerUserId },
    });
    const again = await shop.owner.get(`/suppliers/${supplier.id}`);
    expect(again.json<{ supplier: Supplier }>().supplier).toEqual(supplier);
  });

  it("stores every optional field", async () => {
    const supplier = await addSupplier(shop.owner, "Eastleigh Wholesale Ltd", {
      kraPin: "a123456789b",
      marketOrLocation: "Eastleigh",
      notes: "Ask for Hassan",
      isNeighbour: true,
    });
    expect(supplier).toMatchObject({
      kraPin: "A123456789B",
      marketOrLocation: "Eastleigh",
      notes: "Ask for Hassan",
      isNeighbour: true,
    });
  });

  it.each(RULES)("round-trips the payment rule %j", async (paymentRule) => {
    const created = await addSupplier(shop.owner, `Rule supplier ${paymentRule.type}`, {
      paymentRule,
    });
    expect(created.paymentRule).toEqual(paymentRule);
    const read = await shop.owner.get(`/suppliers/${created.id}`);
    expect(read.json<{ supplier: Supplier }>().supplier.paymentRule).toEqual(paymentRule);
  });

  it("changing the rule replaces it whole, including the period", async () => {
    const s = await addSupplier(shop.owner, "Rule changer Mombasa", {
      paymentRule: { type: "within_time", period: { value: 10, unit: "days" } },
    });
    const to = await shop.owner.patch(`/suppliers/${s.id}`, {
      paymentRule: { type: "after_sold_with_latest_date", period: { value: 1, unit: "months" } },
    });
    expect(to.json<{ supplier: Supplier }>().supplier.paymentRule).toEqual({
      type: "after_sold_with_latest_date",
      period: { value: 1, unit: "months" },
    });
    const cash = await shop.owner.patch(`/suppliers/${s.id}`, { paymentRule: { type: "cash" } });
    expect(cash.json<{ supplier: Supplier }>().supplier.paymentRule).toEqual({ type: "cash" });
  });

  it("refuses a rule without its period and a period outside the limits", async () => {
    for (const paymentRule of [
      { type: "within_time" },
      { type: "within_time", period: { value: 0, unit: "days" } },
      { type: "within_time", period: { value: 2, unit: "years" } },
      { type: "weekly" },
    ]) {
      const res = await shop.owner.post(
        "/suppliers",
        supplierBody("Bad rule shop", { paymentRule } as never),
      );
      expect(res.statusCode, JSON.stringify(paymentRule)).toBe(400);
      expect(res.json().error.code).toBe("validation_failed");
    }
  });

  it("stores USD as the supplier currency", async () => {
    const supplier = await addSupplier(shop.owner, "Dubai Electronics Trading", {
      currency: "USD",
      marketOrLocation: "Dubai",
    });
    expect(supplier.currency).toBe("USD");
    const res = await shop.owner.patch(`/suppliers/${supplier.id}`, { currency: "KES" });
    expect(res.json<{ supplier: Supplier }>().supplier.currency).toBe("KES");
    expect(
      (
        await shop.owner.post(
          "/suppliers",
          supplierBody("Euro Shop Nairobi", { currency: "EUR" } as never),
        )
      ).statusCode,
    ).toBe(400);
  });

  it("accepts an international phone number and rejects nonsense", async () => {
    const dubai = await addSupplier(shop.owner, "Guangzhou Phones Co", {
      phone: "+86 138 0013 8000",
    });
    expect(dubai.phone).toBe("+8613800138000");
    for (const phone of ["12345", "abc", "+12", "0712"]) {
      const res = await shop.owner.post("/suppliers", supplierBody("Bad phone shop", { phone }));
      expect(res.statusCode, phone).toBe(400);
    }
  });

  it("T8: the same phone on another supplier is blocked, written in any Kenyan format", async () => {
    const phone = randomPhone();
    const first = await addSupplier(shop.owner, "Kamau Spares Nairobi", { phone });
    for (const same of [phone, e164(phone), `+254 ${phone.slice(1, 4)} ${phone.slice(4)}`]) {
      const res = await shop.owner.post(
        "/suppliers",
        supplierBody("Totally Different Name", { phone: same }),
      );
      expect(res.statusCode, same).toBe(409);
      expect(res.json().error).toMatchObject({
        code: "supplier_phone_exists",
        details: { existingId: first.id, existingName: "Kamau Spares Nairobi" },
      });
    }
  });

  it("the phone check also covers hidden suppliers, and editing a supplier to a taken phone", async () => {
    const hiddenOne = await addSupplier(shop.owner, "Hidden Chargers Stall");
    expectStatus(await shop.owner.post(`/suppliers/${hiddenOne.id}/hide`), 200);
    const clash = await shop.owner.post(
      "/suppliers",
      supplierBody("Another Stall Altogether", { phone: hiddenOne.phone! }),
    );
    expect(clash.statusCode).toBe(409);
    expect(clash.json().error.details.existingId).toBe(hiddenOne.id);

    const other = await addSupplier(shop.owner, "Zanzibar Imports Direct");
    const patch = await shop.owner.patch(`/suppliers/${other.id}`, { phone: hiddenOne.phone });
    expect(patch.statusCode).toBe(409);
    expect(patch.json().error.code).toBe("supplier_phone_exists");
    // Sending its own phone again changes nothing and is not a clash.
    expect(
      (await shop.owner.patch(`/suppliers/${other.id}`, { phone: other.phone })).statusCode,
    ).toBe(200);
  });

  it("warns about a similar name, and accepts it once acknowledged", async () => {
    const first = await addSupplier(shop.owner, "Nairobi Phone Centre");
    const warn = await shop.owner.post("/suppliers", supplierBody("Nairobi Phone Centre Ltd"));
    expect(warn.statusCode).toBe(409);
    expect(warn.json().error.code).toBe("similar_suppliers");
    expect(warn.json().error.details.suppliers.map((s: Supplier) => s.id)).toEqual([first.id]);
    const ok = await shop.owner.post(
      "/suppliers",
      supplierBody("Nairobi Phone Centre Ltd", { acknowledgeSimilar: true }),
    );
    expect(ok.statusCode).toBe(201);
    const audit = await t.sql(
      "select details from audit_log where action = 'supplier_created' and tenant_id = $1 and target_id = $2",
      [shop.tenantId, ok.json<{ supplier: Supplier }>().supplier.id],
    );
    expect(audit[0]).toMatchObject({ details: { acknowledgedSimilar: [first.id] } });
  });

  it("an identical name is also similar; a different number in the name is not", async () => {
    await addSupplier(shop.owner, "Kisumu Traders 1");
    expect((await shop.owner.post("/suppliers", supplierBody("Kisumu Traders 2"))).statusCode).toBe(
      201,
    );
    const same = await shop.owner.post("/suppliers", supplierBody("kisumu traders 1"));
    expect(same.json().error.code).toBe("similar_suppliers");
  });

  it("the phone clash is reported before the similar-name warning", async () => {
    const a = await addSupplier(shop.owner, "Thika Road Gadgets");
    const res = await shop.owner.post(
      "/suppliers",
      supplierBody("Thika Road Gadgets", { phone: a.phone! }),
    );
    expect(res.json().error.code).toBe("supplier_phone_exists");
  });

  it("edits fields, clears optional ones, and renaming to a similar name warns", async () => {
    const s = await addSupplier(shop.owner, "Garissa Mobile Hub", {
      kraPin: "P051234567Z",
      notes: "old",
    });
    const res = await shop.owner.patch(`/suppliers/${s.id}`, {
      kraPin: null,
      notes: "",
      marketOrLocation: "Garissa",
      isNeighbour: true,
    });
    expect(res.json<{ supplier: Supplier }>().supplier).toMatchObject({
      kraPin: null,
      notes: null,
      marketOrLocation: "Garissa",
      isNeighbour: true,
      status: "active",
    });
    const t1 = await addSupplier(shop.owner, "Meru Cables Depot");
    const warn = await shop.owner.patch(`/suppliers/${t1.id}`, { name: "garissa mobile hub" });
    expect(warn.statusCode).toBe(409);
    expect(warn.json().error.code).toBe("similar_suppliers");
    expect(warn.json().error.details.suppliers.map((x: Supplier) => x.id)).toEqual([s.id]);
    const ack = await shop.owner.patch(`/suppliers/${t1.id}`, {
      name: "garissa mobile hub",
      acknowledgeSimilar: true,
    });
    expect(ack.statusCode).toBe(200);
  });

  it("refuses an empty update, bad input and unknown ids", async () => {
    const s = await addSupplier(shop.owner, "Nyeri Batteries Shop");
    expect((await shop.owner.patch(`/suppliers/${s.id}`, {})).statusCode).toBe(400);
    expect((await shop.owner.patch(`/suppliers/${s.id}`, { kraPin: "12" })).statusCode).toBe(400);
    expect((await shop.owner.patch(`/suppliers/${s.id}`, { name: "x" })).statusCode).toBe(400);
    for (const id of ["00000000-0000-4000-8000-000000000000", "nope"]) {
      const res = await shop.owner.patch(`/suppliers/${id}`, { notes: "x" });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("supplier_not_found");
      expect((await shop.owner.get(`/suppliers/${id}`)).statusCode).toBe(404);
    }
    expect((await shop.owner.post("/suppliers", { name: "No phone shop" })).statusCode).toBe(400);
  });

  it("audits every write without leaking the full phone number", async () => {
    const s = await addSupplier(shop.owner, "Audit Trail Supplies", { phone: "0733445566" });
    await shop.owner.patch(`/suppliers/${s.id}`, {
      notes: "changed",
      paymentRule: { type: "pay_as_you_sell" },
    });
    await shop.owner.post(`/suppliers/${s.id}/hide`);
    await shop.owner.post(`/suppliers/${s.id}/unhide`);
    const rows = await t.sql<{ action: string; details: unknown }>(
      "select action, details from audit_log where tenant_id = $1 and target_id = $2 order by at",
      [shop.tenantId, s.id],
    );
    expect(rows.map((r) => r.action)).toEqual([
      "supplier_created",
      "supplier_updated",
      "supplier_hidden",
      "supplier_unhidden",
    ]);
    expect(rows[1]!.details).toMatchObject({
      before: { notes: null, paymentRule: { type: "cash" } },
      after: { notes: "changed", paymentRule: { type: "pay_as_you_sell" } },
    });
    expect(JSON.stringify(rows)).not.toContain("733445566");
  });

  it("an update that changes nothing writes no audit row", async () => {
    const s = await addSupplier(shop.owner, "Quiet Edits Supplies");
    await shop.owner.patch(`/suppliers/${s.id}`, { name: s.name, notes: null });
    const rows = await t.sql("select 1 from audit_log where tenant_id = $1 and target_id = $2", [
      shop.tenantId,
      s.id,
    ]);
    expect(rows).toHaveLength(1);
  });
});
