import type { SessionResponse } from "@books/shared";

export function makeSession(overrides: Partial<SessionResponse> = {}): SessionResponse {
  return {
    user: {
      id: "u1",
      name: "Amina Hassan",
      phone: "+254712345678",
      email: null,
      language: "en",
      mustChangePassword: false,
    },
    memberships: [{ tenantId: "t1", businessName: "Luthuli Phones", role: "owner" }],
    activeTenantId: "t1",
    ...overrides,
  };
}

export const RECOVERY_CODES = Array.from({ length: 10 }, (_, i) => `CODE-${1000 + i}-XYZ`);

/** Meets the shared password policy (length, 3 kinds, not common). */
export const STRONG_PASSWORD = "Duka-Mpya-2026";
