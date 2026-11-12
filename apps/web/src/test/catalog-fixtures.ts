import type { Category, Product } from "@books/shared";
import type { Routes } from "./mock-fetch";

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "c-phones",
    name: "Phones",
    defaultTracking: "imei",
    namingMode: "parts",
    hidden: false,
    productCount: 0,
    createdAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

export const phonesCategory = makeCategory();
export const chargersCategory = makeCategory({
  id: "c-chargers",
  name: "Chargers",
  defaultTracking: "quantity",
  namingMode: "free",
});

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Samsung A15 128GB Black New",
    categoryId: "c-phones",
    brand: "Samsung",
    model: "A15",
    storage: "128GB",
    colour: "Black",
    condition: "New",
    trackingType: "imei",
    baseUnit: "piece",
    packUnits: [],
    barcodes: [],
    retailPrice: 1550000,
    wholesalePrice: null,
    minPrice: null,
    locationPrices: [],
    vatType: null,
    canBeGivenFree: false,
    warrantyMonths: null,
    status: "active",
    mergedIntoId: null,
    addedBy: { id: "u1", name: "Amina Hassan" },
    createdAt: "2026-11-02T09:00:00.000Z",
    ...overrides,
  };
}

export const business = {
  id: "t1",
  name: "Luthuli Phones",
  address: null,
  phone: null,
  email: null,
  kraPin: null,
  footerNote: null,
  vatEnabled: false,
  hidePricesFromStorekeepers: false,
  createdAt: "2026-11-01T08:00:00.000Z",
};

export const NO_PROBLEMS = {
  body: {
    exactDuplicate: null,
    similar: [],
    barcodeClashes: [],
    name: "Samsung A15 128GB Black New",
  },
};

/** What the add and edit screens load around the form. */
export function catalogRoutes(extra: Routes = {}, vatEnabled = false): Routes {
  return {
    "GET /product-categories": { body: { categories: [phonesCategory, chargersCategory] } },
    "GET /products/options": {
      body: {
        brands: ["Samsung", "Apple"],
        models: [{ brand: "Samsung", model: "A15" }],
        storages: ["128GB"],
        colours: ["Black"],
        conditions: ["Ex-UK"],
      },
    },
    "GET /business": { body: { business: { ...business, vatEnabled } } },
    ...extra,
  };
}

export function productsPage(products: Product[], nextCursor: string | null = null) {
  return { body: { products, nextCursor } };
}
