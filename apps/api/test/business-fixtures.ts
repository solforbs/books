import type {
  CreateStaffRequest,
  CreateStaffResponse,
  Location,
  RegisterResponse,
} from "@books/shared";
import { registerOwner } from "./fixtures";
import type { TestApp } from "./test-app";
import { TestClient, type TestResponse } from "./test-client";

/** Fails the test with the response body when the status is not the expected one. */
export function expectStatus(res: TestResponse, status: number): TestResponse {
  if (res.statusCode !== status) {
    throw new Error(`expected ${status}, got ${res.statusCode}: ${res.body}`);
  }
  return res;
}

export interface OwnerShop {
  owner: TestClient;
  tenantId: string;
  ownerUserId: string;
  ownerMembershipId: string;
  register: RegisterResponse;
  shop: Location;
}

/** A new business: owner registered and logged in, with one shop (and its drawer). */
export async function ownerWithShop(t: TestApp, shopName = "Luthuli Shop 1"): Promise<OwnerShop> {
  const owner = new TestClient(t.app);
  const { response } = await registerOwner(owner);
  const shop = await createLocation(owner, { name: shopName, type: "shop" });
  const staff = expectStatus(await owner.get("/staff"), 200).json<{
    members: { membershipId: string; userId: string }[];
  }>();
  return {
    owner,
    tenantId: response.activeTenantId!,
    ownerUserId: response.user.id,
    ownerMembershipId: staff.members.find((m) => m.userId === response.user.id)!.membershipId,
    register: response,
    shop,
  };
}

export async function createLocation(
  client: TestClient,
  body: { name: string; type: "shop" | "store"; canSell?: boolean },
): Promise<Location> {
  return expectStatus(await client.post("/locations", body), 201).json<{ location: Location }>()
    .location;
}

export async function addStaff(
  client: TestClient,
  body: CreateStaffRequest,
): Promise<CreateStaffResponse> {
  return expectStatus(await client.post("/staff", body), 201).json<CreateStaffResponse>();
}

/** Logs in a fresh client (a different device) and returns it. */
export async function loginAs(
  t: TestApp,
  identifier: string,
  password: string,
): Promise<TestClient> {
  const client = new TestClient(t.app);
  expectStatus(await client.post("/auth/login", { identifier, password }), 200);
  return client;
}
