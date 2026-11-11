import type { Category, Product, UpdateProductRequest } from "@books/shared";
import { useMemo } from "react";
import { useUpdateProduct } from "../hooks/use-product-mutations";
import { useSaveFlow } from "../hooks/use-save-flow";
import { valuesFromProduct } from "../product-form-values";
import { buildUpdateRequest } from "../product-update-request";
import type { FormContextData } from "./form-api";
import { ProductFormView } from "./product-form-view";

interface EditProductFormProps {
  product: Product;
  categories: Category[];
  data: FormContextData;
  onSaved: (product: Product) => void;
  onCancel: () => void;
}

/** Edit one product; only what changed is sent, so untouched prices are never overwritten. */
export function EditProductForm({
  product,
  categories,
  data,
  onSaved,
  onCancel,
}: EditProductFormProps) {
  const update = useUpdateProduct();
  const initial = useMemo(
    () => valuesFromProduct(product, { withPrices: data.canSetPrices }),
    [product, data.canSetPrices],
  );
  const flow = useSaveFlow<UpdateProductRequest>({
    save: async (body, acknowledge) =>
      (
        await update.mutateAsync({
          id: product.id,
          body: acknowledge ? { ...body, acknowledgeSimilar: true } : body,
        })
      ).product,
    onSaved,
  });

  return (
    <ProductFormView
      mode="edit"
      initial={initial}
      categories={categories}
      data={data}
      save={flow}
      onCancel={onCancel}
      onSubmit={(values, category) => {
        const built = buildUpdateRequest(values, initial, { category, ...data });
        if (!built.ok) {
          // Nothing changed: there is nothing to save, so just go back.
          if (built.issues[0]?.message === "nothing_to_update") {
            onCancel();
            return null;
          }
          return built.issues;
        }
        void flow.submit(built.request);
        return null;
      }}
    />
  );
}
