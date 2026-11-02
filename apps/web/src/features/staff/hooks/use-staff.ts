import type { CreateStaffRequest, UpdateStaffRequest } from "@books/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { staffApi } from "../api/staff-api";

export function useStaffList() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "staff"),
    queryFn: async () => (await staffApi.list()).members,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

export function useLoginHistory(membershipId: string, enabled: boolean) {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "staff", membershipId, "logins"),
    queryFn: async () => (await staffApi.logins(membershipId)).entries,
    enabled: enabled && tenantId !== "",
  });
}

/**
 * Staff changes can also change who sees approvals (G1), so the caller's own access is
 * refreshed together with the list.
 */
function useStaffMutation<TArgs, TResult>(call: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    // Results may hold a temporary password: never keep them in the cache after the screen.
    gcTime: 0,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "staff") }),
        queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "access") }),
      ]);
    },
  });
}

export const useCreateStaff = () =>
  useStaffMutation((body: CreateStaffRequest) => staffApi.create(body));

export const useUpdateStaff = () =>
  useStaffMutation(({ id, body }: { id: string; body: UpdateStaffRequest }) =>
    staffApi.update(id, body),
  );

export const useSwitchStaff = () =>
  useStaffMutation(({ id, on }: { id: string; on: boolean }) =>
    on ? staffApi.switchOn(id) : staffApi.switchOff(id),
  );

export const useResetStaffPassword = () =>
  useStaffMutation((id: string) => staffApi.resetPassword(id));
