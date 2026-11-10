import { productSchema, type CheckProductResponse, type Product } from "@books/shared";
import { useCallback, useState } from "react";
import { isApiError } from "@/lib/api";

/** Why a save was stopped before it happened (F01 §9). */
export type SaveBlock =
  | { kind: "duplicate"; productId: string; name: string | null }
  | { kind: "barcode"; clashes: { barcode: string; productId: string; name: string | null }[] }
  | { kind: "similar"; products: Product[] };

/** The same three situations can come back as 409 errors when a check was skipped or raced. */
export function blockFromError(error: unknown): SaveBlock | null {
  if (!isApiError(error)) return null;
  const details = (error.details ?? {}) as Record<string, unknown>;
  if (error.code === "duplicate_product" && typeof details.existingId === "string") {
    return { kind: "duplicate", productId: details.existingId, name: null };
  }
  if (error.code === "barcode_in_use" && typeof details.productId === "string") {
    return {
      kind: "barcode",
      clashes: [
        { barcode: String(details.barcode ?? ""), productId: details.productId, name: null },
      ],
    };
  }
  if (error.code === "similar_products") {
    const products = productSchema.array().safeParse(details.products);
    if (products.success && products.data.length > 0) {
      return { kind: "similar", products: products.data };
    }
  }
  return null;
}

export function blockFromCheck(result: CheckProductResponse): SaveBlock | null {
  if (result.exactDuplicate) {
    return {
      kind: "duplicate",
      productId: result.exactDuplicate.id,
      name: result.exactDuplicate.name,
    };
  }
  if (result.barcodeClashes.length > 0) {
    return {
      kind: "barcode",
      clashes: result.barcodeClashes.map((c) => ({
        barcode: c.barcode,
        productId: c.product.id,
        name: c.product.name,
      })),
    };
  }
  if (result.similar.length > 0) return { kind: "similar", products: result.similar };
  return null;
}

interface SaveFlowOptions<TRequest> {
  /** Dry run of the duplicate checks; leave out to rely on the server's own 409 answers. */
  check?: (request: TRequest) => Promise<CheckProductResponse>;
  save: (request: TRequest, acknowledgeSimilar: boolean) => Promise<Product>;
  onSaved: (product: Product) => void;
}

/**
 * Check first, then save. Duplicates and barcode clashes stop the save; similar products wait
 * for the person's choice ("Not the same, create"), which is sent as acknowledgeSimilar.
 */
export function useSaveFlow<TRequest>({ check, save, onSaved }: SaveFlowOptions<TRequest>) {
  const [block, setBlock] = useState<SaveBlock | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [lastRequest, setLastRequest] = useState<TRequest | null>(null);

  const run = useCallback(
    async (request: TRequest, acknowledge: boolean, withCheck: boolean) => {
      setPending(true);
      setError(null);
      setBlock(null);
      setLastRequest(request);
      try {
        if (withCheck && check) {
          const stop = blockFromCheck(await check(request));
          if (stop) return setBlock(stop);
        }
        onSaved(await save(request, acknowledge));
      } catch (caught) {
        const stop = blockFromError(caught);
        if (stop) setBlock(stop);
        else setError(caught);
      } finally {
        setPending(false);
      }
    },
    [check, save, onSaved],
  );

  const submit = useCallback((request: TRequest) => run(request, false, true), [run]);
  const createAnyway = useCallback(() => {
    if (lastRequest) void run(lastRequest, true, false);
  }, [lastRequest, run]);
  const dismiss = useCallback(() => setBlock(null), []);

  return { submit, createAnyway, dismiss, block, error, pending };
}
