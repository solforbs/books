import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Supplier } from "@books/shared";
import type { OwnerShop } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import { SupplierBalanceProbe } from "../application/supplier-balance-probe";
import { addSupplier, listSuppliers, ownerWithShop, staffMember } from "./suppliers-fixtures";

const names = (r: { suppliers: Supplier[] }) => r.suppliers.map((s) => s.name);

describe("listing, searching and hiding suppliers", () => {
  let t: TestApp;
  let shop: OwnerShop;
  let storekeeper: TestClient;
  let bravo: Supplier;
  let echo: Supplier;
  beforeAll(async () => {
    t = await createTestApp();
    shop = await ownerWithShop(t);
    storekeeper = (await staffMember(t, shop, "storekeeper")).client;
    // Created out of order on purpose: the list must come back alphabetical.
    await addSupplier(shop.owner, "Echo Chargers Ltd", { marketOrLocation: "Eastleigh" });
    await addSupplier(shop.owner, "Alpha Traders", { phone: "0712345678", isNeighbour: true });
    await addSupplier(shop.owner, "Delta Phones Kenya", { phone: "+971501234567" });
    await addSupplier(shop.owner, "Charlie Gadgets");
    await addSupplier(shop.owner, "bravo mobile");
    const all = await listSuppliers(shop.owner);
    bravo = all.suppliers.find((s) => s.name === "bravo mobile")!;
    echo = all.suppliers.find((s) => s.name === "Echo Chargers Ltd")!;
  });
  afterAll(() => t.close());

  it("lists alphabetically, ignoring case", async () => {
    expect(names(await listSuppliers(shop.owner))).toEqual([
      "Alpha Traders",
      "bravo mobile",
      "Charlie Gadgets",
      "Delta Phones Kenya",
      "Echo Chargers Ltd",
    ]);
  });

  it("pages with a cursor and never repeats or skips a supplier", async () => {
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = await listSuppliers(shop.owner, `?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      expect(page.suppliers.length).toBeLessThanOrEqual(2);
      seen.push(...names(page));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);
    expect(pages).toBe(3);
    expect(seen).toEqual([
      "Alpha Traders",
      "bravo mobile",
      "Charlie Gadgets",
      "Delta Phones Kenya",
      "Echo Chargers Ltd",
    ]);
    expect((await listSuppliers(shop.owner, "?limit=5")).nextCursor).toBeNull();
    expect((await shop.owner.get("/suppliers?cursor=garbage")).statusCode).toBe(400);
    expect((await shop.owner.get("/suppliers?limit=101")).statusCode).toBe(400);
    expect((await shop.owner.get("/suppliers?limit=0")).statusCode).toBe(400);
  });

  it("searches by name, market or location, and phone in any written form", async () => {
    expect(names(await listSuppliers(shop.owner, "?q=chargers"))).toEqual(["Echo Chargers Ltd"]);
    expect(names(await listSuppliers(shop.owner, "?q=EASTLEIGH"))).toEqual(["Echo Chargers Ltd"]);
    expect(names(await listSuppliers(shop.owner, "?q=0712345678"))).toEqual(["Alpha Traders"]);
    expect(names(await listSuppliers(shop.owner, "?q=712345"))).toEqual(["Alpha Traders"]);
    expect(names(await listSuppliers(shop.owner, `?q=${encodeURIComponent("+971501")}`))).toEqual([
      "Delta Phones Kenya",
    ]);
    expect(names(await listSuppliers(shop.owner, "?q=phones%20kenya"))).toEqual([
      "Delta Phones Kenya",
    ]);
    expect(names(await listSuppliers(shop.owner, "?q=nothing-like-this"))).toEqual([]);
    // Symbols are not search words, so a lone wildcard narrows nothing (and breaks nothing).
    expect(names(await listSuppliers(shop.owner, "?q=%25"))).toHaveLength(5);
  });

  it("filters neighbour shops", async () => {
    expect(names(await listSuppliers(shop.owner, "?neighbour=true"))).toEqual(["Alpha Traders"]);
    expect((await shop.owner.get("/suppliers?neighbour=false")).statusCode).toBe(400);
  });

  it("shows active and waiting by default; hidden only when asked, status filters one status", async () => {
    const quick = (
      await storekeeper.post("/suppliers/quick", { name: "Foxtrot Waiting Stall" })
    ).json<{
      supplier: Supplier;
    }>().supplier;
    expect(names(await listSuppliers(shop.owner))).toContain("Foxtrot Waiting Stall");
    expect(names(await listSuppliers(shop.owner, "?status=waiting"))).toEqual([
      "Foxtrot Waiting Stall",
    ]);
    expect(names(await listSuppliers(shop.owner, "?status=active"))).not.toContain(
      "Foxtrot Waiting Stall",
    );
    expect(names(await listSuppliers(shop.owner, "?status=hidden"))).toEqual([]);
    expect((await shop.owner.get("/suppliers?status=merged")).statusCode).toBe(400);

    await shop.owner.post(`/suppliers/${bravo.id}/hide`);
    expect(names(await listSuppliers(shop.owner))).not.toContain("bravo mobile");
    expect(names(await listSuppliers(shop.owner, "?status=hidden"))).toEqual(["bravo mobile"]);
    // A hidden supplier can still be opened, and old records keep pointing at it.
    const one = await shop.owner.get(`/suppliers/${bravo.id}`);
    expect(one.json<{ supplier: Supplier }>().supplier.status).toBe("hidden");
    await shop.owner.post(`/suppliers/${bravo.id}/unhide`);
    expect(names(await listSuppliers(shop.owner))).toContain("bravo mobile");
    // The waiting list holds only waiting suppliers, paged like the others.
    const waiting = await shop.owner.get("/suppliers/waiting?limit=1");
    expect(waiting.json<{ suppliers: Supplier[] }>().suppliers.map((s) => s.id)).toEqual([
      quick.id,
    ]);
  });

  it("hiding is blocked while the supplier has a balance, through the extension point", async () => {
    const probe = t.app.get(SupplierBalanceProbe);
    const spy = vi.spyOn(probe, "balanceOf").mockResolvedValue(25_000);
    try {
      const res = await shop.owner.post(`/suppliers/${echo.id}/hide`);
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("supplier_has_balance");
      expect(spy).toHaveBeenCalledWith(shop.tenantId, echo.id);
      expect(names(await listSuppliers(shop.owner))).toContain("Echo Chargers Ltd");
    } finally {
      spy.mockRestore();
    }
    const ok = await shop.owner.post(`/suppliers/${echo.id}/hide`);
    expect(ok.json<{ supplier: Supplier }>().supplier.status).toBe("hidden");
    // Hiding twice, or showing one that is visible, changes nothing.
    expect((await shop.owner.post(`/suppliers/${echo.id}/hide`)).statusCode).toBe(200);
    await shop.owner.post(`/suppliers/${echo.id}/unhide`);
    expect(
      (await shop.owner.post(`/suppliers/${echo.id}/unhide`)).json<{ supplier: Supplier }>()
        .supplier.status,
    ).toBe("active");
    const rows = await t.sql(
      "select action from audit_log where tenant_id = $1 and target_id = $2 and action like 'supplier_%hidden'",
      [shop.tenantId, echo.id],
    );
    expect(rows).toHaveLength(2);
  });

  it("never deletes: the app role has no DELETE on suppliers", async () => {
    const res = await t.sql<{ ok: boolean }>(
      "select has_table_privilege('books_app', 'suppliers', 'DELETE') as ok",
    );
    expect(res[0]!.ok).toBe(false);
  });
});
