import type { BulkCreateRequest, CreateProductRequest, UpdateProductRequest } from "@books/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { productsApi } from "../api/products-api";

/** Any product change can alter lists, the waiting count and category counts, so refresh them. */
function useProductMutation<TArgs, TResult>(call: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "products") }),
        queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "categories") }),
      ]);
    },
  });
}

interface WithId {
  id: string;
}

export const useCheckProduct = () =>
  useMutation({ mutationFn: (body: CreateProductRequest) => productsApi.check(body) });

export const useCreateProduct = () =>
  useProductMutation((body: CreateProductRequest) => productsApi.create(body));
export const useBulkCreate = () =>
  useProductMutation((body: BulkCreateRequest) => productsApi.bulk(body));
export const useUpdateProduct = () =>
  useProductMutation(({ id, body }: WithId & { body: UpdateProductRequest }) =>
    productsApi.update(id, body),
  );
export const useHideProduct = () => useProductMutation((id: string) => productsApi.hide(id));
export const useUnhideProduct = () => useProductMutation((id: string) => productsApi.unhide(id));
export const useApproveProduct = () =>
  useProductMutation(({ id, body }: WithId & { body?: UpdateProductRequest }) =>
    productsApi.approve(id, body),
  );
export const useMergeProduct = () =>
  useProductMutation(({ id, intoId }: WithId & { intoId: string }) =>
    productsApi.merge(id, intoId),
  );
export const useRejectProduct = () => useProductMutation((id: string) => productsApi.reject(id));
export const useAddBarcode = () =>
  useProductMutation(({ id, value }: WithId & { value: string }) =>
    productsApi.addBarcode(id, value),
  );
export const useGenerateBarcode = () =>
  useProductMutation((id: string) => productsApi.generateBarcode(id));
export const useRetireBarcode = () =>
  useProductMutation(({ id, barcodeId }: WithId & { barcodeId: string }) =>
    productsApi.retireBarcode(id, barcodeId),
  );
export const useAddPack = () =>
  useProductMutation(({ id, body }: WithId & { body: { name: string; size: number } }) =>
    productsApi.addPack(id, body),
  );
export const useRetirePack = () =>
  useProductMutation(({ id, packId }: WithId & { packId: string }) =>
    productsApi.retirePack(id, packId),
  );
