import { randomInt } from "node:crypto";
import type { RegisterRequest, RegisterResponse } from "@books/shared";
import type { TestClient } from "./test-client";

export const PASSWORD = "Duka-Imara-2026!";
export const NEW_PASSWORD = "Bidhaa#Mpya-77x";

/** A random, valid Kenyan mobile number in local format, e.g. 0712345678. */
export function randomPhone(): string {
  return `07${randomInt(10_000_000, 99_999_999)}`;
}

/** The E.164 form the API stores. */
export function e164(localPhone: string): string {
  return `+254${localPhone.slice(1)}`;
}

export function randomEmail(): string {
  return `owner${randomInt(1_000_000_000)}@Example.com`;
}

export function registration(overrides: Partial<RegisterRequest> = {}): RegisterRequest {
  return {
    businessName: "Nuru Electronics",
    ownerName: "Amina Hassan",
    phone: randomPhone(),
    password: PASSWORD,
    ...overrides,
  };
}

/** Registers an owner and returns the response (the client keeps the cookies). */
export async function registerOwner(
  client: TestClient,
  overrides: Partial<RegisterRequest> = {},
): Promise<{ request: RegisterRequest; response: RegisterResponse }> {
  const request = registration(overrides);
  const res = await client.post("/auth/register", request);
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.statusCode} ${res.body}`);
  return { request, response: res.json<RegisterResponse>() };
}
