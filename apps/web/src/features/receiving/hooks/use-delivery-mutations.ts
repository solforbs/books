import type { CompleteUnitsRequest, CreateDeliveryRequest, EnterCostsRequest } from "@books/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { deliveriesApi } from "../api/deliveries-api";

/**
 * A delivery changes stock, what we owe a supplier and the money places, so all of those are
 * refreshed afterwards.
 */
function useDeliveryMutation<TArgs>(
  call: (args: TArgs) => ReturnType<typeof deliveriesApi.create>,
) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    onSuccess: async () => {
      await Promise.all(
        ["deliveries", "stock", "suppliers"].map((part) =>
          queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, part) }),
        ),
      );
    },
  });
}

export const useCreateDelivery = () =>
  useDeliveryMutation((body: CreateDeliveryRequest) => deliveriesApi.create(body));
export const useEnterCosts = () =>
  useDeliveryMutation(({ id, body }: { id: string; body: EnterCostsRequest }) =>
    deliveriesApi.enterCosts(id, body),
  );
export const useCompleteUnits = () =>
  useDeliveryMutation(({ id, body }: { id: string; body: CompleteUnitsRequest }) =>
    deliveriesApi.completeUnits(id, body),
  );
