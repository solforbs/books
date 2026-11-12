# ARCH-02 — Inventory and Ledger Foundation (design proposal)

Status: **PROPOSAL, not yet built** · 2026-11-11
Serves: F04 Receiving (first), then F06 Selling, F07 Payments, F08 Returns, F10 Transfers, F11 Day close, F12 Reports.
Principle: **one event is stored once; stock, balances and reports are derived from it** (ARCH-01 §6, G4: nothing is deleted).

## 1. Why this comes first
F04 says one save must change stock, IMEIs, product costs, what we owe a supplier and how much is in a money place. Selling, paying and returning all change the same things. So we build **one shared foundation** and every feature posts to it.

## 2. The three building blocks

### 2.1 Stock (what we have)
| Table | What it holds |
|---|---|
| `stock_layers` | One row per **delivery line and location**: product, received quantity, **remaining quantity**, unit cost in KES (null = price pending or cost missing), supplier, delivery id, received date. Quantity goods are sold from the **oldest layer first** (G7, F03 §4.1). |
| `stock_units` | One row per **IMEI or serial number** (IMEI/serial products only): the number(s), product, location, status (`in_stock`, `incomplete`, `sold`, `reserved`, `damaged`, ...), its own exact cost, its delivery line. Unique per business among units that are not closed. |
| `stock_movements` | **Append-only log**: every change of quantity or unit status (`receive`, `sell`, `return`, `adjust`, `transfer_out`, `transfer_in`, ...), who, when, where, why, link to the source document. Nothing is edited; a mistake is a reversing movement. |

Stock on hand for a product at a location = the sum of the remaining quantities of its layers (quantity goods), or the count of `in_stock` units (IMEI/serial goods). It is kept as a projection that can always be rebuilt from the movements.

**Cost rules (from the approved specs):**
- IMEI/serial goods: the unit's **exact cost**.
- Quantity goods: the **oldest layer's unit cost**, layer by layer.
- Free items are spread over all pieces of that product on the delivery (F04 §4.1).
- **Cost is never guessed.** A layer with no cost is "cost missing" and its sales show "profit unknown" (F04 §5, G7).

### 2.2 Ledger (where the money is, who owes what)
Double-entry in the background; the owner never sees accounting words (ARCH-01 §6).

| Table | What it holds |
|---|---|
| `ledger_entries` | One row per business event: type, date, who, location, source document id, `command_id` (makes writes safe to repeat). |
| `ledger_lines` | The two or more sides of an entry: **account**, amount in cents, currency, KES amount, optional supplier/customer/money place/product reference. The lines of an entry always add up to zero. |

**Accounts used first:** `inventory` (stock at cost), `supplier_payable` (per supplier), a `money_place` account for each money place (cash drawer, Till, Paybill, bank, safe), `expense:*` (extra costs), `exchange_difference`, `opening_balance`.
**Balances are never typed.** A money place's balance, a supplier's balance and the stock value are sums of ledger lines.

### 2.3 Documents (what the user sees)
`deliveries` (+ `delivery_lines`, `delivery_payments`, `delivery_claims`), later `sales`, `payments`, `returns`. Each document is saved once; **corrections are new entries**, and the document keeps a history (who, when, before, after).

## 3. What one delivery posts (F04 §3)
Example: supplier S1 (rule "pay within 1 month"), 50 chargers at 450 and 3 iPhones at 95,000, **part paid 100,000 from the cash drawer**.

| Effect | Posting |
|---|---|
| Stock goes up | 2 `stock_layers` (+50, +3), 3 `stock_units` (one per IMEI) with exact cost, 5 `stock_movements` of type `receive` |
| Value goes up | Debit `inventory` 307,500 |
| Money paid | Credit cash-drawer account 100,000 |
| Supplier owed | Credit `supplier_payable[S1]` 207,500, due date from the supplier's rule (or the rule chosen for this delivery) |
| Extra costs (transport) | Debit `expense:transport` 1,500, Credit the chosen money place 1,500, linked to the delivery |
All in **one database transaction**; repeating the same `command_id` returns the first result (G6, offline sync).

**USD deliveries (F03 §5):** the supplier debt is kept in USD; the stock cost is stored in KES at the delivery's rate; the rate is typed or pre-filled and always editable; paying in KES later records the difference as a separate `exchange_difference` line.
**Price pending / cost missing:** the layer has no cost; inventory is not debited for it until the cost is entered; the supplier balance shows "+ amount pending". Entering the cost later posts the missing entry.
**VAT:** only when the business has VAT on: each line also keeps its VAT amount (F04 §4.1).

## 4. When money is due (F03 §4)
Each delivery stores the **rule it was made under** (copied from the supplier or changed for this delivery). Due amounts are **calculated, not stored**: a pure function takes the delivery's layers (how much of each has been sold), the rule, and today's date, and returns what is due now, due soon and due later. Selling and returns (F06, F08) only change the remaining quantity of layers; they never touch the due calculation directly.

## 5. Invariants (each becomes an automated test)
1. Every ledger entry sums to zero, per currency.
2. Stock on hand = sum of layer remaining quantities = movements replayed.
3. A money place balance = sum of its ledger lines; a supplier balance = sum of its payable lines.
4. An IMEI can be in stock at most once in a business (database unique constraint).
5. Nothing is deleted or edited in place; corrections are reversing entries.
6. Every row has `tenant_id` and row-level security (CLAUDE.md rule 5).
7. Repeating a `command_id` never duplicates anything.

## 6. How F04 is split into slices
| Slice | Content | What you can do after it |
|---|---|---|
| **2b-1 Foundation** | Stock tables and movements, the ledger, balance reads, a read-only **Stock** screen (by product and location) and **IMEI lookup** | See stock (empty at first), look up a phone by IMEI |
| **2b-2 Receiving** | The delivery sheet (scan or type, IMEIs, costs, free items, extra costs, USD, price pending), paying at delivery, incomplete IMEIs, shortage/damage claims, edit and cancel | Record a real delivery; stock, costs, supplier debt and cash drawer all update |
| **2b-3 Starting stock and orders** | Starting stock (several sessions), the "cost missing" to-do, supplier orders as a PDF sent on WhatsApp, receiving against an order | A new shop can load its shelves; order from suppliers |

## 7. Points to confirm with the founders
1. **Cost of quantity goods: CONFIRMED by the founders (2026-11-11): oldest delivery first.** Each delivery is its own cost layer; no averaging.
2. **Where stock sits:** one delivery goes to one location (approved). Stock is always counted per location; the business total is the sum.
