import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { shopBarcodeFromSequence, type Product, type ProductHistoryResponse } from "@books/shared";
import { expectStatus } from "../../../../test/business-fixtures";
import { createTestApp, type TestApp } from "../../../../test/test-app";
import { accessoryBody, addProduct, phoneBody, shopWithCatalog } from "./catalog-fixtures";

const activeValues = (p: Product) => p.barcodes.filter((b) => b.active).map((b) => b.value);

describe("S1b review fixes: merging respects the barcode sharing rule (F01 §7)", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  const iphone = (phonesId: string, condition: string, barcodes: string[] = []) =>
    phoneBody(phonesId, { brand: "Apple", model: "iPhone 13", condition, barcodes });
  const get = async (client: { get: (u: string) => Promise<{ json: <T>() => T }> }, id: string) =>
    (await client.get(`/products/${id}`)).json<{ product: Product }>().product;

  it("retires a manufacturer barcode the target could not hold, and says so in the history", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const code = "1940000123456";
    const sibling = await addProduct(owner, iphone(phones.id, "New", [code]));
    const exUk = await addProduct(owner, iphone(phones.id, "Ex-UK", [code]));
    const unrelated = await addProduct(
      owner,
      phoneBody(phones.id, { brand: "Samsung", model: "A15", condition: "New" }),
    );

    const merged = expectStatus(
      await owner.post(`/products/${exUk.id}/merge`, { intoProductId: unrelated.id }),
      200,
    ).json<{ product: Product }>().product;
    expect(merged.status).toBe("merged");
    expect(activeValues(merged)).toEqual([]);
    expect(activeValues(await get(owner, unrelated.id))).toEqual([]);
    expect(activeValues(await get(owner, sibling.id))).toEqual([code]);
    const scan = (await owner.get(`/products/lookup?barcode=${code}`)).json<{
      products: Product[];
    }>();
    expect(scan.products.map((p) => p.id)).toEqual([sibling.id]);

    const history = (
      await owner.get(`/products/${unrelated.id}/history`)
    ).json<ProductHistoryResponse>();
    const note = history.entries.find((e) => e.action === "merge_barcode_not_moved");
    expect(note?.after).toMatchObject({ fromProductId: exUk.id, barcodes: [code] });
  });

  it("still moves the barcode when the target is a condition sibling, and shop barcodes always move", async () => {
    const { owner, phones } = await shopWithCatalog(t);
    const code = "1940000999991";
    await addProduct(owner, iphone(phones.id, "New", [code]));
    const exUk = await addProduct(owner, iphone(phones.id, "Ex-UK", [code]));
    const refurb = await addProduct(owner, iphone(phones.id, "Refurbished"));
    const generated = (await owner.post(`/products/${exUk.id}/barcodes/generate`, {})).json<{
      product: Product;
    }>().product;
    const shopCode = generated.barcodes.find((b) => b.kind === "shop")!.value;

    expectStatus(await owner.post(`/products/${exUk.id}/merge`, { intoProductId: refurb.id }), 200);
    expect(activeValues(await get(owner, refurb.id)).sort()).toEqual([code, shopCode].sort());
    const history = (
      await owner.get(`/products/${refurb.id}/history`)
    ).json<ProductHistoryResponse>();
    expect(history.entries.map((e) => e.action)).not.toContain("merge_barcode_not_moved");
  });
});

describe("S1b review fixes: barcode length and generation", () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it("accepts barcodes up to 43 characters (founders' decision 16.8) and no more", async () => {
    const { owner, accessories } = await shopWithCatalog(t);
    const long = "A".repeat(43);
    const created = await addProduct(
      owner,
      accessoryBody(accessories.id, "Long label", { barcodes: [long] }),
    );
    expect(activeValues(created)).toEqual([long]);
    const other = await addProduct(owner, accessoryBody(accessories.id, "Other label"));
    expectStatus(
      await owner.post(`/products/${other.id}/barcodes`, { value: "B".repeat(43) }),
      200,
    );
    const tooLong = await owner.post(`/products/${other.id}/barcodes`, { value: "C".repeat(44) });
    expect(tooLong.statusCode).toBe(400);
    const tooLongCreate = await owner.post(
      "/products",
      accessoryBody(accessories.id, "Too long", { barcodes: ["D".repeat(44)] }),
    );
    expect(tooLongCreate.statusCode).toBe(400);
  });

  it("answers 409 barcode_generation_failed when 25 numbers in a row are taken, and moves on after", async () => {
    const { owner, accessories, tenantId } = await shopWithCatalog(t);
    const holder = await addProduct(owner, accessoryBody(accessories.id, "Holder"));
    const target = await addProduct(owner, accessoryBody(accessories.id, "Needs a label"));
    for (let n = 1; n <= 25; n++) {
      await t.tenantSql(
        tenantId,
        "insert into product_barcodes (tenant_id, product_id, value, kind) values ($1, $2, $3, 'manufacturer')",
        [tenantId, holder.id, shopBarcodeFromSequence(n)],
      );
    }
    const res = await owner.post(`/products/${target.id}/barcodes/generate`, {});
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("barcode_generation_failed");
    const [seq] = await t.tenantSql<{ last_value: string }>(
      tenantId,
      "select last_value from barcode_sequences",
    );
    expect(Number(seq!.last_value)).toBe(25);
    expect(activeValues(await getProduct(owner, target.id))).toEqual([]);

    const retry = expectStatus(
      await owner.post(`/products/${target.id}/barcodes/generate`, {}),
      200,
    );
    expect(activeValues(retry.json<{ product: Product }>().product)).toEqual([
      shopBarcodeFromSequence(26),
    ]);
  });
});

async function getProduct(
  client: { get: (u: string) => Promise<{ json: <T>() => T }> },
  id: string,
): Promise<Product> {
  return (await client.get(`/products/${id}`)).json<{ product: Product }>().product;
}
