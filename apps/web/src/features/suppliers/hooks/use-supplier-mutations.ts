import type {
  ApproveSupplierRequest,
  CreateSupplierRequest,
  QuickSupplierRequest,
  UpdateSupplierRequest,
} from "@books/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { suppliersApi } from "../api/suppliers-api";

/** Any supplier change can alter the list, the waiting count and details, so refresh them. */
function useSupplierMutation<TArgs, TResult>(call: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "suppliers") }),
  });
}

export const useCreateSupplier = () =>
  useSupplierMutation((body: CreateSupplierRequest) => suppliersApi.create(body));
export const useQuickSupplier = () =>
  useSupplierMutation((body: QuickSupplierRequest) => suppliersApi.quick(body));
export const useUpdateSupplier = () =>
  useSupplierMutation(({ id, body }: { id: string; body: UpdateSupplierRequest }) =>
    suppliersApi.update(id, body),
  );
export const useApproveSupplier = () =>
  useSupplierMutation(({ id, body }: { id: string; body: ApproveSupplierRequest }) =>
    suppliersApi.approve(id, body),
  );
export const useHideSupplier = () => useSupplierMutation((id: string) => suppliersApi.hide(id));
export const useUnhideSupplier = () => useSupplierMutation((id: string) => suppliersApi.unhide(id));
