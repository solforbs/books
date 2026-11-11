import type {
  Category,
  CreateProductRequest,
  PermissionOverrides,
  Product,
  Role,
} from "@books/shared";
import {
  addStaff,
  expectStatus,
  firstLogin,
  ownerWithShop,
  type OwnerShop,
} from "../../../../test/business-fixtures";
import { randomPhone } from "../../../../test/fixtures";
import type { TestApp } from "../../../../test/test-app";
import type { TestClient } from "../../../../test/test-client";

export interface Catalog extends OwnerShop {
  phones: Category;
  accessories: Category;
}

export async function createCategory(
  client: TestClient,
  body: { name: string; defaultTracking?: string; namingMode?: string },
): Promise<Category> {
  return expectStatus(await client.post("/product-categories", body), 201).json<{
    category: Category;
  }>().category;
}

/** A new business with a "Phones" category (parts names, IMEI) and "Accessories" (typed names). */
export async function shopWithCatalog(t: TestApp): Promise<Catalog> {
  const shop = await ownerWithShop(t);
  const phones = await createCategory(shop.owner, {
    name: "Phones",
    defaultTracking: "imei",
    namingMode: "parts",
  });
  const accessories = await createCategory(shop.owner, { name: "Accessories" });
  return { ...shop, phones, accessories };
}

/** Creates a product and expects 201. */
export async function addProduct(client: TestClient, body: CreateProductRequest): Promise<Product> {
  return expectStatus(await client.post("/products", body), 201).json<{ product: Product }>()
    .product;
}

export const phoneBody = (
  categoryId: string,
  over: Partial<CreateProductRequest> = {},
): CreateProductRequest => ({
  categoryId,
  brand: "Samsung",
  model: "A15",
  storage: "128GB",
  colour: "Black",
  condition: "New",
  retailPrice: 1_800_000,
  ...over,
});

export const accessoryBody = (
  categoryId: string,
  name: string,
  over: Partial<CreateProductRequest> = {},
): CreateProductRequest => ({ categoryId, name, retailPrice: 150_000, ...over });

/** Adds a staff member of the given role at the shop and returns a logged-in client for them. */
export async function staffMember(
  t: TestApp,
  shop: OwnerShop,
  role: Role,
  permissions: PermissionOverrides = {},
): Promise<{ client: TestClient; userId: string; name: string }> {
  const phone = randomPhone();
  const name = `${role} ${phone.slice(-4)}`;
  const { member, temporaryPassword } = await addStaff(shop.owner, {
    name,
    phone,
    role,
    locationIds: [shop.shop.id],
    permissions,
  });
  const client = await firstLogin(t, phone, temporaryPassword);
  return { client, userId: member.userId, name };
}
