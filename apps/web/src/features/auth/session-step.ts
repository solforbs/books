import type { SessionResponse } from "@books/shared";

export type SessionStep = "change-password" | "choose-business" | "home";

export const STEP_PATHS: Record<SessionStep, string> = {
  "change-password": "/change-password",
  "choose-business": "/choose-business",
  home: "/",
};

/** Where a logged-in person must go next. A temporary password is replaced before anything else. */
export function nextStep(session: SessionResponse): SessionStep {
  if (session.user.mustChangePassword) return "change-password";
  if (session.activeTenantId === null) return "choose-business";
  return "home";
}

export function activeBusinessName(session: SessionResponse): string | undefined {
  return session.memberships.find((m) => m.tenantId === session.activeTenantId)?.businessName;
}
