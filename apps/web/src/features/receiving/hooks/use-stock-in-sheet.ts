import type { PaymentRule, Product, Supplier } from "@books/shared";
import { useReducer, useState } from "react";
import { useNavigate } from "react-router";
import { useAccess } from "@/features/access/hooks/use-access";
import { useCurrentLocation } from "@/features/locations/hooks/current-location";
import { useMoneyPlaces } from "@/features/locations/hooks/use-money-places";
import {
  buildDeliveryRequest,
  computeTotals,
  incompleteRows,
  allUnits,
} from "../build-delivery-request";
import { creditDraft, type PaymentDraft } from "../payment-draft";
import { sheetReducer, type SheetRow } from "../sheet-state";
import { useCreateDelivery } from "./use-delivery-mutations";
import { useCommandId } from "./use-command-id";

let rowCounter = 0;
const nextKey = () => `row-${++rowCounter}`;

/** Everything the Stock in sheet holds and does; the page only draws it. */
export function useStockInSheet() {
  const navigate = useNavigate();
  const { can, data: access } = useAccess();
  const { current } = useCurrentLocation();
  const places = useMoneyPlaces().data ?? [];
  const create = useCreateDelivery();
  const idFor = useCommandId();

  const [rows, dispatch] = useReducer(sheetReducer, []);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [chosenLocation, setChosenLocation] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentDraft>(creditDraft);
  const [paymentRule, setPaymentRule] = useState<PaymentRule | "invalid" | null>(null);
  const [allowIncomplete, setAllowIncomplete] = useState(false);
  const [confirmSoldBefore, setConfirmSoldBefore] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const canSeeCost = can("see_cost_profit");
  // Payments need the known cost, so people who cannot see costs never get the payment step.
  const canPay = can("pay_suppliers") && canSeeCost;
  const locationId = chosenLocation || current?.id || "";
  const input = {
    rows,
    supplier,
    locationId,
    invoiceNumber,
    note,
    payment,
    paymentRule,
    allowIncomplete,
    confirmSoldBefore,
    canSeeCost,
    canPay,
  };
  const built = buildDeliveryRequest(input);
  const totals = computeTotals(rows, canSeeCost);

  const send = async (confirmed: boolean) => {
    setAttempted(true);
    setError(null);
    const result = buildDeliveryRequest({
      ...input,
      confirmSoldBefore: confirmed || confirmSoldBefore,
    });
    if (!result.ok) return;
    if (confirmed) setConfirmSoldBefore(true);
    try {
      const { delivery } = await create.mutateAsync({
        commandId: idFor(result.request),
        ...result.request,
      });
      navigate(`/receiving/${delivery.id}`, { state: { saved: true } });
    } catch (caught) {
      setError(caught);
    }
  };

  return {
    rows,
    supplier,
    locationId,
    invoiceNumber,
    note,
    payment,
    allowIncomplete,
    totals,
    canSeeCost,
    canPay,
    canConfirmSoldBefore: access?.role === "owner" || access?.role === "manager",
    deliveryUnits: allUnits(rows),
    incomplete: incompleteRows(rows),
    issues: attempted && !built.ok ? built.issues : [],
    error,
    saving: create.isPending,
    // Money places of the chosen location that are still in use.
    places: places.filter((p) => !p.hidden && p.locationIds.includes(locationId)),
    addProduct: (product: Product) => dispatch({ type: "add", product, key: nextKey() }),
    patchRow: (key: string, patch: Partial<Omit<SheetRow, "key" | "product">>) =>
      dispatch({ type: "patch", key, patch }),
    removeRow: (key: string) => dispatch({ type: "remove", key }),
    setSupplier,
    // The money places belong to the location, so a new location starts again from credit.
    setLocation: (id: string) => {
      setChosenLocation(id);
      setPayment(creditDraft);
    },
    setInvoiceNumber,
    setNote,
    setPayment,
    setPaymentRule,
    setAllowIncomplete,
    save: () => void send(false),
    saveConfirmed: () => void send(true),
  };
}
