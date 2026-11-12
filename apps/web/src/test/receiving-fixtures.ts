import type { Delivery, StockRow, StockUnit } from "@books/shared";
import { makeProduct } from "./catalog-fixtures";
import { makeAccess, makeMoneyPlace } from "./shop-fixtures";
import { makeSupplier, supplierBody, suppliersPage } from "./supplier-fixtures";

/** Valid IMEIs (15 digits, correct check digit). */
export const IMEI_A = "490154203237518";
export const IMEI_B = "356938035643809";
export const IMEI_C = "352099001761481";

export const charger = makeProduct({
  id: "p-charger",
  name: "Oraimo 20W Charger",
  trackingType: "quantity",
  categoryId: "c-chargers",
  barcodes: [],
});
export const iphone = makeProduct({
  id: "p-iphone",
  name: "iPhone 13 Pro 128GB Blue New",
  trackingType: "imei",
});
export const boxed = makeProduct({
  id: "p-boxed",
  name: "USB Cable",
  trackingType: "quantity",
  packUnits: [
    {
      id: "pk-box",
      name: "Box",
      size: 10,
      wholesalePrice: null,
      retailPrice: null,
      active: true,
    },
  ],
});

export const supplier = makeSupplier({
  paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
});

export function productPage(...products: ReturnType<typeof makeProduct>[]) {
  return { body: { products, nextCursor: null } };
}

export const drawer = makeMoneyPlace();
export const moneyPlacesBody = { body: { moneyPlaces: [drawer] } };

/** Routes every stock-in test needs: a supplier list and the money places. */
export function stockInRoutes() {
  return {
    "GET /suppliers": suppliersPage([supplier]),
    "GET /money-places": moneyPlacesBody,
    "GET /products/lookup?barcode=6901234567890": productPage(charger),
    "GET /products/lookup?barcode=IPHONE": productPage(iphone),
    "GET /products": productPage(charger, iphone),
  };
}

export function makeDelivery(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: "d1",
    number: 1,
    supplier: { id: "s1", name: "Eastleigh Phones Ltd" },
    location: { id: "l1", name: "Luthuli Shop 1" },
    invoiceNumber: null,
    note: null,
    paymentRule: { type: "within_time", period: { value: 1, unit: "months" } },
    knownTotalCents: 30_750_000,
    pendingCostLines: 0,
    paidCents: 0,
    owedCents: 30_750_000,
    dueDate: "2026-12-12",
    incompleteUnits: 0,
    lines: [
      {
        id: "dl1",
        product: { id: "p-charger", name: "Oraimo 20W Charger", trackingType: "quantity" },
        packUnit: null,
        quantity: 50,
        pieces: 50,
        lineTotalCents: 2_250_000,
        costState: "known",
        units: [],
        missingUnits: 0,
      },
      {
        id: "dl2",
        product: { id: "p-iphone", name: "iPhone 13 Pro 128GB Blue New", trackingType: "imei" },
        packUnit: null,
        quantity: 3,
        pieces: 3,
        lineTotalCents: 28_500_000,
        costState: "known",
        units: [IMEI_A, IMEI_B, IMEI_C].map((imei, i) => ({
          id: `u${i}`,
          imei,
          imei2: null,
          serial: null,
          status: "in_stock" as const,
        })),
        missingUnits: 0,
      },
    ],
    payments: [],
    warnings: [],
    createdBy: { id: "u1", name: "Amina Hassan" },
    createdAt: "2026-11-12T09:00:00.000Z",
    ...overrides,
  };
}

export const deliveryBody = (d: Delivery) => ({ body: { delivery: d } });
export const deliveriesBody = (deliveries: Delivery[], nextCursor: string | null = null) => ({
  body: { deliveries, nextCursor },
});

export function makeStockRow(overrides: Partial<StockRow> = {}): StockRow {
  return {
    productId: "p-charger",
    productName: "Oraimo 20W Charger",
    categoryId: "c-chargers",
    trackingType: "quantity",
    locationId: "l1",
    locationName: "Luthuli Shop 1",
    onHand: 50,
    incomplete: 0,
    costMissing: 0,
    valueCents: 2_250_000,
    ...overrides,
  };
}

export function makeStockUnit(overrides: Partial<StockUnit> = {}): StockUnit {
  return {
    id: "su1",
    imei: IMEI_A,
    imei2: null,
    serial: null,
    status: "in_stock",
    product: { id: "p-iphone", name: "iPhone 13 Pro 128GB Blue New" },
    location: { id: "l2", name: "Shop 2" },
    deliveryId: "d1",
    deliveryNumber: 1,
    receivedAt: "2026-11-12T09:00:00.000Z",
    costCents: 9_500_000,
    ...overrides,
  };
}

/** A storekeeper who receives stock but may not see costs or pay suppliers. */
export const storekeeperAccess = makeAccess({
  role: "storekeeper",
  locationIds: ["l1"],
  permissions: ["receive_stock", "add_products"],
});

/** A manager with the cost and payment permissions. */
export const managerAccess = makeAccess({
  role: "manager",
  locationIds: ["l1"],
  permissions: [
    "receive_stock",
    "see_cost_profit",
    "pay_suppliers",
    "manage_suppliers",
    "add_products",
  ],
});

/** A cashier who may see costs but not pay suppliers. */
export const costNoPayAccess = makeAccess({
  role: "cashier",
  locationIds: ["l1"],
  permissions: ["receive_stock", "see_cost_profit"],
});

export { supplierBody };
