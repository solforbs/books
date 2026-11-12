import type { Supplier } from "@books/shared";
import { useCallback, useState } from "react";
import { isApiError } from "@/lib/api";

/** Why a save was stopped (F03 §3): the phone is taken, or the name looks like another one. */
export type SupplierBlock =
  | { kind: "phone"; existingId: string; existingName: string | null }
  | { kind: "similar"; suppliers: { id: string; name: string }[] };

/** `details` of the two 409 answers; read leniently because the exact shape is not fixed. */
export function blockFromError(error: unknown): SupplierBlock | null {
  if (!isApiError(error)) return null;
  const details = (error.details ?? {}) as Record<string, unknown>;
  if (error.code === "supplier_phone_exists" && typeof details.existingId === "string") {
    return {
      kind: "phone",
      existingId: details.existingId,
      existingName: typeof details.existingName === "string" ? details.existingName : null,
    };
  }
  if (error.code === "similar_suppliers" && Array.isArray(details.suppliers)) {
    const suppliers = details.suppliers.flatMap((s: unknown) => {
      const item = (s ?? {}) as Record<string, unknown>;
      return typeof item.id === "string" && typeof item.name === "string"
        ? [{ id: item.id, name: item.name }]
        : [];
    });
    if (suppliers.length > 0) return { kind: "similar", suppliers };
  }
  return null;
}

interface Options<TRequest> {
  save: (request: TRequest, acknowledgeSimilar: boolean) => Promise<Supplier>;
  onSaved: (supplier: Supplier) => void;
}

/** Save, and keep the 409 answers as a choice for the person ("Not the same, create"). */
export function useSupplierSave<TRequest>({ save, onSaved }: Options<TRequest>) {
  const [block, setBlock] = useState<SupplierBlock | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [last, setLast] = useState<TRequest | null>(null);

  const run = useCallback(
    async (request: TRequest, acknowledge: boolean) => {
      setPending(true);
      setError(null);
      setBlock(null);
      setLast(request);
      try {
        onSaved(await save(request, acknowledge));
      } catch (caught) {
        const stop = blockFromError(caught);
        if (stop) setBlock(stop);
        else setError(caught);
      } finally {
        setPending(false);
      }
    },
    [save, onSaved],
  );

  return {
    submit: (request: TRequest) => run(request, false),
    createAnyway: () => {
      if (last) void run(last, true);
    },
    dismiss: () => setBlock(null),
    block,
    error,
    pending,
  };
}
