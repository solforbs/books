import { randomUUID } from "node:crypto";
import type {
  CreateDeliveryRequest,
  Delivery,
  DeliveryLineInput,
  Location,
  PermissionOverrides,
  Product,
  Role,
  Supplier,
} from "@books/shared";
import { createLocation, expectStatus } from "../../../../test/business-fixtures";
import type { TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";
import {
  accessoryBody,
  addProduct,
  phoneBody,
  shopWithCatalog,
  staffMember,
  type Catalog,
} from "../../catalog/__tests__/catalog-fixtures";
import { addSupplier } from "../../suppliers/__tests__/suppliers-fixtures";

/** A valid 15-digit IMEI built from a counter (14 digits plus the Luhn check digit). */
export function imei(n: number): string {
  const body = `35${String(n).padStart(12, "0")}`;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(body[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return `${body}${(10 - (sum % 10)) % 10}`;
}

export interface ReceivingShop extends Catalog {
  /** Pays within 1 month. */
  supplier: Supplier;
  shop2: Location;
  charger: Product;
  earphones: Product;
  phone: Product;
  /** The cash drawer of shop 1. */
  drawerId: string;
}

/** A business with two shops, a supplier, a quantity product, a pack product and an IMEI phone. */
export async function receivingShop(t: TestApp): Promise<ReceivingShop> {
  const shop = await shopWithCatalog(t);
  const shop2 = await createLocation(shop.owner, { name: "Shop 2", type: "shop" });
  const supplier = await addSupplier(shop.owner, "Mombasa Traders", {
    paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
  });
  const charger = await addProduct(
    shop.owner,
    accessoryBody(shop.accessories.id, "Oraimo Charger"),
  );
  const earphones = await addProduct(shop.owner, accessoryBody(shop.accessories.id, "Earphones"));
  const phone = await addProduct(shop.owner, phoneBody(shop.phones.id));
  return { ...shop, supplier, shop2, charger, earphones, phone, drawerId: shop.shop.cashDrawerId! };
}

export const line = (
  productId: string,
  quantity: number,
  lineTotalCents?: number,
  extra: Partial<DeliveryLineInput> = {},
): DeliveryLineInput => ({ productId, quantity, lineTotalCents, ...extra });

/** A delivery body for shop 1 from the shop supplier; every call has a fresh commandId. */
export const deliveryBody = (
  s: ReceivingShop,
  lines: DeliveryLineInput[],
  over: Partial<CreateDeliveryRequest> = {},
): CreateDeliveryRequest => ({
  commandId: randomUUID(),
  supplierId: s.supplier.id,
  locationId: s.shop.id,
  lines,
  ...over,
});

/** Saves a delivery and expects 201. */
export async function receive(client: TestClient, body: CreateDeliveryRequest): Promise<Delivery> {
  return expectStatus(await client.post("/deliveries", body), 201).json<{ delivery: Delivery }>()
    .delivery;
}

/** A staff member at shop 1; `see_cost_profit` etc. can be switched on with `permissions`. */
export const staffAt = (
  t: TestApp,
  s: ReceivingShop,
  role: Role,
  permissions: PermissionOverrides = {},
) => staffMember(t, s, role, permissions);

export const errorOf = (res: { json: <T>() => T }) =>
  res.json<{ error: { code: string; details?: Record<string, unknown> } }>().error;
