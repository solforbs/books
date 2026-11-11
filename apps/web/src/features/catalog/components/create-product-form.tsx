import type { Category, CreateProductRequest, Product } from "@books/shared";
import { useCheckProduct, useCreateProduct } from "../hooks/use-product-mutations";
import { useSaveFlow } from "../hooks/use-save-flow";
import type { ProductFormValues } from "../product-form-values";
import { useCurrentLocation } from "@/features/locations/hooks/current-location";
import { buildCreateRequest } from "../product-request";
import type { FormContextData } from "./form-api";
import { ProductFormView } from "./product-form-view";

interface CreateProductFormProps {
  initial: ProductFormValues;
  categories: Category[];
  data: FormContextData;
  onSaved: (product: Product) => void;
  onCancel: () => void;
}

/** Add one product: checks for duplicates first, then saves. */
export function CreateProductForm({
  initial,
  categories,
  data,
  onSaved,
  onCancel,
}: CreateProductFormProps) {
  const check = useCheckProduct();
  const create = useCreateProduct();
  const { current: currentLocation } = useCurrentLocation();
  const flow = useSaveFlow<CreateProductRequest>({
    check: check.mutateAsync,
    save: async (request, acknowledge) =>
      (await create.mutateAsync(acknowledge ? { ...request, acknowledgeSimilar: true } : request))
        .product,
    onSaved,
  });

  return (
    <ProductFormView
      mode="create"
      initial={initial}
      categories={categories}
      data={data}
      save={flow}
      onCancel={onCancel}
      onSubmit={(values, category) => {
        const built = buildCreateRequest(
          values,
          { category, ...data },
          { locationId: currentLocation?.id },
        );
        if (!built.ok) return built.issues;
        void flow.submit(built.request);
        return null;
      }}
    />
  );
}
