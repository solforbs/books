import {
  buildProductName,
  cleanText,
  createProductRequestSchema,
  type Category,
  type CreateProductRequest,
  type TrackingType,
} from "@books/shared";
import { parseMoneyInput } from "./money-input";
import type { ProductFormValues } from "./product-form-values";

/** The part of a validation issue that the form's field errors need. */
export interface FormIssue {
  path: string[];
  message: string;
  code: string;
  minimum?: number;
}

export interface RequestContext {
  category: Category | undefined;
  canSetPrices: boolean;
  vatEnabled: boolean;
}

export type BuildResult<T> = { ok: true; request: T } | { ok: false; issues: FormIssue[] };

const required = (field: string): FormIssue => ({
  path: [field],
  message: "required",
  code: "too_small",
  minimum: 1,
});
const badAmount = (field: string): FormIssue => ({
  path: [field],
  message: "invalid_amount",
  code: "custom",
});

const PART_FIELDS = ["brand", "model", "storage", "colour", "condition"] as const;

export function effectiveTracking(
  values: ProductFormValues,
  category: Category | undefined,
): TrackingType {
  return values.trackingType ?? category?.defaultTracking ?? "quantity";
}

const orNull = (text: string): string | null => cleanText(text) || null;

function money(text: string, field: string, issues: FormIssue[]): number | null {
  const parsed = parseMoneyInput(text);
  if (parsed.ok) return parsed.value;
  issues.push(badAmount(field));
  return null;
}

/** Fields the create and update requests share, plus everything wrong with the form. */
export function collect(values: ProductFormValues, ctx: RequestContext, requireRetail: boolean) {
  const issues: FormIssue[] = [];
  const parts = ctx.category?.namingMode === "parts";
  if (!values.categoryId) issues.push(required("categoryId"));
  if (parts) {
    for (const field of PART_FIELDS) if (!cleanText(values[field])) issues.push(required(field));
  } else if (!cleanText(values.name)) {
    issues.push(required("name"));
  }

  const tracking = effectiveTracking(values, ctx.category);
  const fields = {
    categoryId: values.categoryId,
    name: parts ? buildProductName(values) : cleanText(values.name),
    brand: orNull(values.brand),
    model: orNull(values.model),
    storage: orNull(values.storage),
    colour: orNull(values.colour),
    condition: orNull(values.condition),
    trackingType: tracking,
    baseUnit: cleanText(values.baseUnit) || "piece",
    canBeGivenFree: values.canBeGivenFree,
    warrantyMonths: null as number | null,
    retailPrice: null as number | null,
    wholesalePrice: null as number | null,
    minPrice: null as number | null,
    locationPrices: [] as {
      locationId: string;
      retailPrice: number | null;
      wholesalePrice: number | null;
    }[],
    vatType: ctx.vatEnabled ? values.vatType || "standard" : null,
  };

  if (values.warrantyMonths.trim()) {
    const months = Number(values.warrantyMonths);
    if (Number.isInteger(months) && months >= 1 && months <= 120) fields.warrantyMonths = months;
    else issues.push(badAmount("warrantyMonths"));
  }
  if (ctx.canSetPrices) {
    fields.retailPrice = money(values.retail, "retail", issues);
    if (requireRetail && fields.retailPrice === null && !issues.some((i) => i.path[0] === "retail"))
      issues.push(required("retail"));
    fields.wholesalePrice = money(values.wholesale, "wholesale", issues);
    fields.minPrice = money(values.minPrice, "minPrice", issues);
    for (const row of values.locationPrices) {
      if (!row.retail.trim() && !row.wholesale.trim()) continue;
      fields.locationPrices.push({
        locationId: row.locationId,
        retailPrice: money(row.retail, "locationPrices", issues),
        wholesalePrice: money(row.wholesale, "locationPrices", issues),
      });
    }
  }
  return { fields, issues, parts };
}

function packUnits(values: ProductFormValues, ctx: RequestContext, issues: FormIssue[]) {
  if (effectiveTracking(values, ctx.category) !== "quantity") return [];
  const units: NonNullable<CreateProductRequest["packUnits"]> = [];
  for (const row of values.packs) {
    if (!row.name.trim() && !row.size.trim()) continue;
    const size = Number(row.size);
    if (!row.name.trim() || !Number.isInteger(size) || size < 2) {
      issues.push(badAmount("packUnits"));
      continue;
    }
    const unit: (typeof units)[number] = { name: cleanText(row.name), size };
    if (ctx.canSetPrices) {
      const wholesalePrice = money(row.wholesale, "packUnits", issues);
      const retailPrice = money(row.retail, "packUnits", issues);
      if (wholesalePrice !== null) unit.wholesalePrice = wholesalePrice;
      if (retailPrice !== null) unit.retailPrice = retailPrice;
    }
    units.push(unit);
  }
  return units;
}

type Source = "form" | "bulk" | "quick_add" | "import";

export function buildCreateRequest(
  values: ProductFormValues,
  ctx: RequestContext,
  options: { source?: Source; acknowledgeSimilar?: boolean; locationId?: string } = {},
): BuildResult<CreateProductRequest> {
  const { fields, issues, parts } = collect(values, ctx, ctx.canSetPrices);
  const packs = packUnits(values, ctx, issues);
  const draft: CreateProductRequest = {
    categoryId: fields.categoryId,
    trackingType: fields.trackingType,
    baseUnit: fields.baseUnit,
    packUnits: packs,
    barcodes: values.barcodes,
    canBeGivenFree: fields.canBeGivenFree,
    acknowledgeSimilar: options.acknowledgeSimilar ?? false,
    source: options.source ?? "form",
    // The shop the person is working in, recorded in the product history (F01 §8).
    ...(options.locationId ? { locationId: options.locationId } : {}),
    locationPrices: fields.locationPrices,
    ...(parts ? {} : { name: fields.name }),
    ...(fields.brand ? { brand: fields.brand } : {}),
    ...(fields.model ? { model: fields.model } : {}),
    ...(fields.storage ? { storage: fields.storage } : {}),
    ...(fields.colour ? { colour: fields.colour } : {}),
    ...(fields.condition ? { condition: fields.condition } : {}),
    ...(fields.retailPrice !== null ? { retailPrice: fields.retailPrice } : {}),
    ...(fields.wholesalePrice !== null ? { wholesalePrice: fields.wholesalePrice } : {}),
    ...(fields.minPrice !== null ? { minPrice: fields.minPrice } : {}),
    ...(fields.vatType ? { vatType: fields.vatType as "standard" } : {}),
    ...(fields.warrantyMonths !== null ? { warrantyMonths: fields.warrantyMonths } : {}),
  };
  if (issues.length > 0) return { ok: false, issues };
  const parsed = createProductRequestSchema.safeParse(draft);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.map(String),
        message: i.message,
        code: i.code,
      })),
    };
  }
  return { ok: true, request: draft };
}
