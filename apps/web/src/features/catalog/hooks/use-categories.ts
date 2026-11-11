import type { CreateCategoryRequest, UpdateCategoryRequest } from "@books/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TENANT_STALE_MS, tenantKey, useTenantId } from "@/features/access/hooks/use-tenant";
import { categoriesApi } from "../api/categories-api";

/** The business's own category list (hidden ones come back only for people who manage them). */
export function useCategories() {
  const tenantId = useTenantId();
  return useQuery({
    queryKey: tenantKey(tenantId, "categories"),
    queryFn: async () => (await categoriesApi.list()).categories,
    enabled: tenantId !== "",
    staleTime: TENANT_STALE_MS,
  });
}

function useCategoryMutation<TArgs, TResult>(call: (args: TArgs) => Promise<TResult>) {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  return useMutation({
    mutationFn: call,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantKey(tenantId, "categories") }),
  });
}

export const useCreateCategory = () =>
  useCategoryMutation((body: CreateCategoryRequest) => categoriesApi.create(body));

export const useUpdateCategory = () =>
  useCategoryMutation(({ id, body }: { id: string; body: UpdateCategoryRequest }) =>
    categoriesApi.update(id, body),
  );
