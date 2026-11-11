import type { PaymentRule, Supplier } from "@books/shared";
import { makeAccess } from "./shop-fixtures";

export function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: "s1",
    name: "Eastleigh Phones Ltd",
    phone: "+254712345678",
    paymentRule: { type: "cash" } as PaymentRule,
    currency: "KES",
    isNeighbour: false,
    kraPin: null,
    marketOrLocation: null,
    notes: null,
    status: "active",
    addedBy: { id: "u1", name: "Amina Hassan" },
    createdAt: "2026-11-02T09:00:00.000Z",
    ...overrides,
  };
}

export function suppliersPage(suppliers: Supplier[], nextCursor: string | null = null) {
  return { body: { suppliers, nextCursor } };
}

export function supplierBody(supplier: Supplier) {
  return { body: { supplier } };
}

/** A storekeeper-like person: can receive stock, cannot manage suppliers. */
export const receiverAccess = makeAccess({
  role: "storekeeper",
  locationIds: ["l1"],
  permissions: ["receive_stock", "add_products"],
});

/** A cashier whose receive-stock switch is off: no Suppliers at all. */
export const noSupplierAccess = makeAccess({
  role: "cashier",
  locationIds: ["l1"],
  permissions: ["sell"],
});

/** A manager who can manage suppliers but cannot approve. */
export const managerNoApprove = makeAccess({
  role: "manager",
  locationIds: ["l1"],
  permissions: ["manage_suppliers", "receive_stock"],
});
