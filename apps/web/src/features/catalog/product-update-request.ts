import { updateProductRequestSchema, type UpdateProductRequest } from "@books/shared";
import type { ProductFormValues } from "./product-form-values";
import { collect, type BuildResult, type RequestContext } from "./product-request";

/** Which form fields feed each request key; a key is sent only when one of them changed. */
const SOURCES: Record<string, (keyof ProductFormValues)[]> = {
  categoryId: ["categoryId"],
  name: ["name", "brand", "model", "storage", "colour", "condition"],
  brand: ["brand"],
  model: ["model"],
  storage: ["storage"],
  colour: ["colour"],
  condition: ["condition"],
  trackingType: ["trackingType"],
  baseUnit: ["baseUnit"],
  retailPrice: ["retail"],
  wholesalePrice: ["wholesale"],
  minPrice: ["minPrice"],
  locationPrices: ["locationPrices"],
  vatType: ["vatType"],
  canBeGivenFree: ["canBeGivenFree"],
  warrantyMonths: ["warrantyMonths"],
};

/** Only what the person actually changed, so untouched prices are never overwritten. */
export function buildUpdateRequest(
  values: ProductFormValues,
  initial: ProductFormValues,
  ctx: RequestContext,
  acknowledgeSimilar = false,
): BuildResult<UpdateProductRequest> {
  const { fields, issues } = collect(values, ctx, false);
  if (issues.length > 0) return { ok: false, issues };
  const priceKeys = ["retailPrice", "wholesalePrice", "minPrice", "locationPrices"];
  const request: Record<string, unknown> = {};
  for (const [key, sources] of Object.entries(SOURCES)) {
    if (priceKeys.includes(key) && !ctx.canSetPrices) continue;
    if (key === "vatType" && !ctx.vatEnabled) continue;
    const changed = sources.some((s) => JSON.stringify(values[s]) !== JSON.stringify(initial[s]));
    if (changed) request[key] = fields[key as keyof typeof fields];
  }
  if (acknowledgeSimilar) request.acknowledgeSimilar = true;
  const parsed = updateProductRequestSchema.safeParse(request);
  if (!parsed.success) {
    return {
      ok: false,
      issues: [{ path: ["form"], message: "nothing_to_update", code: "custom" }],
    };
  }
  return { ok: true, request: request as UpdateProductRequest };
}
