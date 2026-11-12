import type {
  CreateSupplierRequest,
  PermissionOverrides,
  Role,
  Supplier,
  SuppliersResponse,
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

export const supplierBody = (
  name: string,
  over: Partial<CreateSupplierRequest> = {},
): CreateSupplierRequest => ({ name, phone: randomPhone(), ...over });

/** Creates a supplier through the API and expects 201. */
export async function addSupplier(
  client: TestClient,
  name: string,
  over: Partial<CreateSupplierRequest> = {},
): Promise<Supplier> {
  return expectStatus(await client.post("/suppliers", supplierBody(name, over)), 201).json<{
    supplier: Supplier;
  }>().supplier;
}

export async function listSuppliers(client: TestClient, query = ""): Promise<SuppliersResponse> {
  return expectStatus(await client.get(`/suppliers${query}`), 200).json<SuppliersResponse>();
}

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

export { ownerWithShop };
