import type { MyAccessResponse, Permission } from "@books/shared";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { fetchMyAccess } from "../api/access-api";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "./use-tenant";

/** Effective role, locations and permissions from GET /me/permissions. */
export function useMyAccess() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "access"),
    queryFn: fetchMyAccess,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

export interface Access {
  data: MyAccessResponse | undefined;
  isOwner: boolean;
  can: (permission: Permission) => boolean;
}

/** Permission checks for showing or hiding UI. Nothing is allowed until access has loaded. */
export function useAccess(): Access {
  const { data } = useMyAccess();
  const can = useCallback(
    (permission: Permission) => data?.permissions.includes(permission) ?? false,
    [data],
  );
  return { data, isOwner: data?.role === "owner", can };
}
