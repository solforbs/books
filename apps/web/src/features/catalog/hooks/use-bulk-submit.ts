import type { Category, CreateProductRequest } from "@books/shared";
import { useState } from "react";
import { outcomeFromResult, type BulkRowData, type RowOutcome } from "../bulk-rows";
import type { FormContextData } from "../components/form-api";
import { emptyValues } from "../product-form-values";
import { buildCreateRequest } from "../product-request";
import { useBulkCreate } from "./use-product-mutations";

interface BulkInput {
  category: Category;
  brand: string;
  model: string;
  prices: Record<string, string>;
}

/**
 * Sends rows to POST /products/bulk. Each row is checked and created on its own, so the
 * answer is one outcome per row; rows that fail before sending (no price) get a local outcome.
 */
export function useBulkSubmit(data: FormContextData) {
  const bulk = useBulkCreate();
  const [outcomes, setOutcomes] = useState<Record<string, RowOutcome>>({});

  const submit = async (rows: BulkRowData[], input: BulkInput, acknowledgeSimilar: boolean) => {
    const items: CreateProductRequest[] = [];
    const sent: BulkRowData[] = [];
    const next: Record<string, RowOutcome> = {};
    for (const row of rows) {
      const built = buildCreateRequest(
        emptyValues({
          categoryId: input.category.id,
          brand: input.brand,
          model: input.model,
          storage: row.storage,
          colour: row.colour,
          condition: row.condition,
          retail: input.prices[row.key] ?? "",
        }),
        { category: input.category, canSetPrices: data.canSetPrices, vatEnabled: data.vatEnabled },
        { source: "bulk", acknowledgeSimilar },
      );
      if (built.ok) {
        items.push(built.request);
        sent.push(row);
      } else {
        const noPrice = built.issues.some(
          (i) => i.path[0] === "retail" && i.message === "required",
        );
        next[row.key] = { kind: noPrice ? "needsPrice" : "invalid" };
      }
    }
    if (items.length > 0) {
      try {
        const { results } = await bulk.mutateAsync({ items });
        for (const result of results) {
          const row = sent[result.index];
          if (row) next[row.key] = outcomeFromResult(result);
        }
      } catch {
        // The failure is shown from `error`; rows stay as they were so nothing is lost.
      }
    }
    setOutcomes((previous) => ({ ...previous, ...next }));
  };

  return { submit, outcomes, pending: bulk.isPending, error: bulk.error, reset: bulk.reset };
}
