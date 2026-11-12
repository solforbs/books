# F04a — Receiving Stock, first part (core)

Status: **BUILD PLAN for the first part of F04** (the approved spec stays `F04-receiving-stock.md`; this file only says what is built first and in what order) · 2026-11-12
Foundation design: `../architecture/ARCH-02-inventory-ledger.md`.
Rule for this build: **no assumptions**. Anything the approved specs do not state goes to `../OPEN-QUESTIONS.md`.

## What F04 is split into
| Part | Content (section numbers refer to F04) | Status |
|---|---|---|
| **F04a core** | §2 the sheet, §3 receiving flow, §4.1 costs (known or pending), §4.3 IMEI rules, §7 permissions, the stock and ledger foundation, paying at delivery, the supplier debt and its due rule | **built first** |
| **F04b** | §4.1 free items, extra costs, US dollars; §4.2 shortages and damaged-on-arrival claims; §4.4 low-profit warning; §4.5 edit and cancel a delivery | after F04a |
| **F04c** | §5 starting stock and the "cost missing" to-do; §6 supplier orders and PDF on WhatsApp, receiving against an order | after F04b |

## F04a scope in detail
1. **Stock foundation** (ARCH-02): cost layers (one per delivery line), one record per IMEI/serial unit, an append-only movement log, the ledger (supplier debt, money places, inventory value).
2. **A delivery** is saved in ONE step: supplier, location, optional invoice number and note, and lines.
3. **A line:** product, unit (pieces or one of the product's pack units, converted to pieces), quantity, the **line total** (cost each is calculated by the screen), and for IMEI or serial products the list of numbers.
4. **Cost known or pending:** a line without a total is "price pending" (F04 §4.1). It still adds stock and can be sold; its sales show "profit unknown" later. People who cannot see costs can only save lines without a total ("cost to be added"). The owner or manager enters it afterwards.
5. **IMEI rules (F04 §4.3):** 15 digits with a valid check digit; no duplicate inside the delivery; an IMEI already in stock anywhere in the business is blocked; an IMEI sold before needs the owner's or a manager's confirmation; the number of IMEIs must equal the quantity, otherwise the delivery can be saved as **incomplete** and those units cannot be sold until completed.
6. **Payment at delivery:** nothing paid (credit), part paid, or fully paid, each from one or more of the shop's money places. The rest becomes **what we owe the supplier**, under the supplier's payment rule (or a rule chosen for this delivery only). Only people allowed to pay suppliers can record a payment.
7. **Safe repeats:** the request carries a client-made `commandId`; sending the same one again returns the first result (offline devices retry).
8. **Never edited in place:** a saved delivery is a record. Corrections come in F04b.

## Not in F04a (so it is not built yet)
Free items, extra costs, US dollar deliveries, claims, editing and cancelling, the low-profit warning, starting stock, orders. Hidden from the screens, not half-built.

## Screens (F04a)
- **Stock in**: choose the supplier (a new name can be typed and is saved as a waiting supplier, F03), the location (current one by default), the sheet, the payment step, Save.
- **The sheet**: add a row by typing part of a name or scanning a barcode or IMEI; scanning the same barcode again adds 1; cost each or line total; unit; IMEIs by scanning or pasting a list; totals bar. Compact list on phones, grid on larger screens.
- **Deliveries list and one delivery page**: what arrived, costs, what was paid, what is owed, incomplete IMEIs.
- **Stock** (read only): what we have by product and location; an IMEI lookup.

## Permissions (F04 §7 with the existing permission names)
| Action | Permission |
|---|---|
| Receive stock | `receive_stock` |
| See and enter costs | `see_cost_profit` |
| Pay a supplier at delivery | `pay_suppliers` (new; owners and managers by default) |
| Enter missing costs afterwards | `see_cost_profit` AND (owner, or a person the owner allowed) |

## Test examples (from F04 §10 and F03 §10)
T1 basic credit delivery; T2 repeat scan; T3 line total; T8 IMEI already in stock; T9 incomplete IMEIs; T7 price pending; T13 is F04b. Plus: every ledger entry sums to zero; stock on hand equals the sum of its layers; the same `commandId` twice creates one delivery; row-level security on every new table; cross-business isolation.
