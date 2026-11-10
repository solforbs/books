import type { Location, ProductOptionsResponse } from "@books/shared";
import type { ProductFormValues } from "../product-form-values";

/** What the form sections need from the form: the values, a setter, and per-field errors. */
export interface FormApi {
  values: ProductFormValues;
  set: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;
  error: (field: string) => string | undefined;
}

/** Loaded data the add and edit forms need around the product itself. */
export interface FormContextData {
  options: ProductOptionsResponse | undefined;
  /** Open locations (for per-location prices). */
  locations: Location[];
  vatEnabled: boolean;
  canSetPrices: boolean;
}
