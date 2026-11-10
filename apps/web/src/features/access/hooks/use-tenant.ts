import { useSession } from "@/features/auth/hooks/use-session";

/** The selected business. Every business-owned query key starts with it, so data never mixes. */
export function useTenantId(): string {
  return useSession().data?.activeTenantId ?? "";
}

/**
 * Business data changes rarely and every change made here refreshes it explicitly, so screens
 * opening later reuse what is loaded instead of asking the server again.
 */
export const TENANT_STALE_MS = 60_000;

export function tenantKey(tenantId: string, ...parts: string[]) {
  return ["tenant", tenantId, ...parts] as const;
}
