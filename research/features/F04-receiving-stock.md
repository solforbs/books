# F04 — Receiving Stock, Starting Stock & Supplier Orders

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01 Products, F02 Locations & Staff, F03 Suppliers (all approved).
Not in this feature: reading invoice photos (F05), paying suppliers later (F07), returns to suppliers (F08), moving stock between locations (F10).
Approvals only appear when the business has non-approver staff (see F01–F03). KRA fields are optional.

## 1. Purpose
Get goods **into stock correctly with the least typing**. One delivery updates stock, IMEIs, product costs and what we owe the supplier in a single save. Shops can also **order** from suppliers over WhatsApp, and later receive against that order.

## 2. The "sheet" screen (used for receiving, starting stock and orders)
The founders asked for something **like an Excel sheet: simple to add rows**.

| Product | Qty | Unit | Cost each | Line total | IMEIs |
|---|---|---|---|---|---|
| Oraimo 20W Charger | 50 | piece | 450 | 22,500 | — |
| iPhone 13 Pro 128GB Blue New | 3 | piece | 95,000 | 285,000 | 3/3 ✔ |
| + scan or type to add a row | | | | | |

- **Add a row:** scan a barcode or IMEI, or type part of the name. **Scanning the same barcode again adds 1** to that row instead of creating a new row.
- **Edit like a sheet:** tap a cell and type; Enter moves to the next cell.
- **Cost:** type **cost each** *or* **line total**; the other is calculated.
- **Unit:** piece, box or carton (from F01). Stock is always stored in pieces.
- **IMEIs:** the IMEI cell opens a scan list (scan box after box), or **paste a list** (from Excel or WhatsApp text). The row shows 3/3 ✔ when the number of IMEIs equals the quantity.
- **Last cost** from this supplier is pre-filled.
- **Totals bar** at the bottom: number of items, total cost.
- **On phones:** the sheet shows as a compact list (one row per product, with tap-to-edit). **On tablet or computer:** a full grid, and you can **paste rows from Excel**.
- An unknown barcode → quick add product (F01) without leaving the sheet.

## 3. Receiving a delivery: simple flow
1. **Stock in** → choose supplier (recent ones first, or type to search; a new name is saved as a waiting supplier, F03).
2. The location is the current one (changeable). **One delivery = one location.**
3. Fill the sheet (§2). Optional: supplier invoice number, photo of the paper, note.
4. **Payment:** *Paid now* (pick cash / M-Pesa / bank) · *Part paid* (amount + where from) · *Credit* (uses the supplier's rule from F03, changeable for this delivery).
5. **Save.** Done.

**What happens automatically:**
- stock goes up at this location;
- each IMEI becomes a unit with its own cost;
- product costs update;
- the supplier balance goes up by the unpaid amount, with its due rule;
- the money place goes down by what was paid;
- a "low profit" warning appears if a selling price is now too close to the new cost.

## 4. Rules

### 4.1 Costs
- Cost = what the supplier charged per piece, as on the invoice. **Only when VAT is on:** each line also stores its VAT amount, following KRA rules.
- **Free items** ("buy 10, get 1 free"): add the free piece with cost 0 *or* tick "free item". The app spreads the cost across all pieces of that product on the delivery (10 × 1,000 = 10,000 / 11 = 909 each).
- **Extra costs** (transport, clearing, boda): **recorded as an expense**, not added to the goods' cost (founders' decision). The delivery screen has an optional "Extra costs" field. It creates an expense, category **"Transport & delivery"** or **"Clearing / customs"**, linked to the delivery and paid from the chosen money place.
- **Price pending** (the supplier will tell the price later): leave the cost empty and tick "price pending".
  - The goods can be received and sold.
  - Profit on those sales shows as **"profit unknown"** until the cost is entered.
  - The supplier balance shows "+ amount pending".
  - The owner or manager gets a reminder.
  - "Paid now" is not possible for a line whose price is pending.
- **USD deliveries:** costs in USD, with the rate pre-filled and editable (F03 §5). Stock cost is stored in KES.

### 4.2 When the delivery doesn't match the supplier's paper
- **Fewer arrived** (paper says 20, 18 arrived): record **18**. Optionally add the 2 as "**short**" on a claim line. A claim is **not owed** unless the owner marks it as accepted.
- **Arrived broken:** record them on a claim line as "**damaged on arrival**". Not added to sellable stock; not owed unless accepted. Returning them is F08.
- **More arrived than ordered or billed:** record what arrived, with a warning showing the difference.

### 4.3 IMEIs
- The number of IMEIs must equal the quantity before saving. Otherwise there is an option to **save as incomplete**: the row is marked, and the missing IMEIs must be scanned before those units can be sold.
- An IMEI is checked for a valid format (15 digits, valid check digit). An invalid one is rejected with a beep and a message.
- An IMEI **already in stock** anywhere in the business → blocked.
- An IMEI **sold before** (a phone that has come back) → warning: "Sold on 12 Mar to …. Is this a return or trade-in? Use Returns/Trade-in instead." It can only be received here if an owner or manager confirms.
- **Pasted lists:** duplicates and invalid IMEIs are shown in red; the user fixes or removes them.
- A second IMEI and the serial number are optional.

### 4.4 Prices
- When a new cost makes profit low (selling price < cost, or below the minimum margin the owner sets), a **warning** appears with "Change selling price". Only owners and managers can change prices; others see the warning only.

### 4.5 Correcting a saved delivery
- **Owner or manager** can edit a saved delivery (quantity, cost, IMEIs, supplier, payment terms). Every change is kept in the history (who, when, before, after).
- If some items are already **sold**: past profit is recalculated, with a note "cost corrected on <date>".
- If some items were already **moved or sold**, the quantity can't go below what has left the location. The app explains what to do instead (adjustment, F08).
- **Cancel delivery** is allowed only if nothing from it was sold or moved. Cancelling is recorded; nothing is ever deleted.

## 5. Starting stock (when a shop joins)
- **Stock in → Starting stock** → choose the location → fill the same sheet. Or **import from Excel**, or a **stock-book photo** (the same preview as F01).
- **Supplier is optional.** Linking a supplier is only needed if that supplier's "pay after sold" starting balance should follow these goods (F03 §7).
- **Cost: no guessing.** If the cost isn't known, **leave it empty**. The app never invents a cost.
  - Items without cost are marked **"cost missing"**.
  - The owner sees a to-do: "**37 products have no cost — add costs**", opening a sheet of just those products to fill in quickly.
  - **Only the owner** can enter missing starting costs (founders' decision). Managers can if the owner allows it.
  - Sales of "cost missing" items show **"profit unknown"**. Reports show a banner: "Profit is incomplete: 37 products have no cost".
- IMEI products in starting stock: scan each phone you have (or paste the list).
- Starting stock can be entered in **several sessions** (one shelf at a time). Each session is saved separately.

## 6. Orders to suppliers (send via WhatsApp)
**Simple flow:**
1. **Orders → New order** → choose supplier.
2. Fill the same sheet (product and quantity only; **no prices on orders**). Shortcut: **"Add low-stock items"** adds everything below its low-stock level (once low-stock levels exist, F12).
3. **Send** → the app creates a **professional purchase order document (PDF)** (added with F12, founders' request), like a proper invoice-style order:
   - **header:** shop logo, business name, address, phone (and KRA PIN if entered), from "Business details" (F02);
   - **title "PURCHASE ORDER"**, order number, date, location to deliver to;
   - **supplier:** name, phone (and KRA PIN if entered);
   - **table:** #, item name, unit (piece/box/carton), **quantity** (no prices, per the founders' decision);
   - total number of items, notes, and "Prepared by <name>".

   **Send on WhatsApp:**
   - WhatsApp opens on the supplier's chat with a short message ("Purchase order PO-0012 from <shop>: 5 items, see attached").
   - The PDF is shared through the phone's share menu. On most phones the person must pick the supplier's chat once, because WhatsApp doesn't allow apps to attach files to a chosen number automatically [I, to confirm in testing].
   - The person always taps Send themselves. It optionally attaches a PDF. WhatsApp opens with the supplier's number and the message filled in; **the user taps Send in WhatsApp**. The app never sends anything without the user doing it.
4. The order is saved as **Sent**.

**Receiving against an order:**
- **Stock in → From order** → the sheet is pre-filled with the ordered items. Change what actually arrived → Save.
- If only part arrived, the order stays **Part received** with the rest still open. The user can close the remainder ("supplier won't send").
- An order changes **nothing** in stock or money. Only receiving does.

**Other channels:** "Share" also allows SMS, copy text, or PDF.

## 7. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Receive stock | ✔ | ✔ | ✔ (owner can switch off) | ✔ | ✖ |
| See and enter costs | ✔ | ✔ | if allowed | if allowed | view |
| Pay supplier at delivery | ✔ | ✔ | if allowed | if allowed | ✖ |
| Edit or cancel a saved delivery | ✔ | ✔ | ✖ | ✖ | ✖ |
| Enter missing starting costs | ✔ | if allowed | ✖ | ✖ | ✖ |
| Create and send orders | ✔ | ✔ | ✖ | ✖ | ✖ |

**Staff who can't see costs:** they receive quantities and IMEIs only. The delivery is then saved as **"cost to be added"** for the owner or manager (like "price pending").

## 8. Offline and multi-location
- Receiving works **fully offline**. Stock and IMEIs update on the device immediately and sync later.
- **The same IMEI received on two offline devices** → after sync, both are flagged; the owner or manager decides which is correct.
- Orders can be prepared offline. WhatsApp sending needs internet (WhatsApp handles that).

## 9. Edge cases (checklist)
1. The same product appears twice in a sheet (two rows) → merged into one row automatically, unless the costs differ (then kept separate).
2. Quantity typed as 0 or negative → not allowed.
3. A very large quantity or cost (e.g. typo 100,000 chargers) → "Are you sure?" if over 10× the usual for that product.
4. A product is waiting for approval (F01) → can be received; the approver sees it.
5. Cost typed per carton but unit left as piece → the app shows the cost per piece next to it, so mistakes are visible.
6. Supplier changes payment terms for this delivery only → change it on the payment step; the supplier's default rule is unchanged.
7. Paid now from the cash drawer with too little cash in it → warning (the drawer would go negative); allowed only for owner or manager.
8. IMEI list pasted with spaces, dashes or 14 digits → cleaned automatically where safe (spaces and dashes); 14-digit values are flagged for review.
9. Delivery saved by mistake to the wrong location → owner or manager edits the location if nothing has been sold or moved; otherwise use a transfer.
10. A starting-stock product later receives a real delivery → the delivery cost doesn't fill the old "cost missing" items. Those stay missing until the owner fills them.
11. An order is sent twice to WhatsApp → it is the same order (same number); the app records "shared 2 times".
12. Receiving from an order where the supplier substituted a different model → add the actual product as a new row; the ordered row stays as not received.

## 10. Test examples (acceptance)
- **T1 Basic credit delivery:** supplier S1 (rule: 1 month); 50 chargers at 450 and 3 iPhones at 95,000 with 3 IMEIs → stock +50 and +3; S1 owed 307,500, due in 1 month; the IMEIs are sellable.
- **T2 Repeat scan:** scanning the charger barcode 5 times → one row with qty 5.
- **T3 Line total:** qty 20, line total 9,000 → cost each 450.
- **T4 Free items:** 10 at 1,000 + 1 free → 11 pieces at 909.09 each; owed 10,000.
- **T5 Extra cost:** delivery with transport 1,500 paid in cash → an expense of 1,500 "Transport & delivery" linked to the delivery; the goods' cost is unchanged.
- **T6 Short delivery:** paper 20, received 18, 2 short → stock +18; owed for 18; a claim of 2 open.
- **T7 Price pending:** 10 earphones, price pending → stock +10; a sale shows "profit unknown"; after the owner enters cost 300, the sale's profit is recalculated.
- **T8 IMEI already in stock:** scanning an IMEI that is in stock at Shop 2 → blocked with "In stock at Shop 2".
- **T9 Incomplete IMEIs:** qty 5, 3 IMEIs, saved as incomplete → 3 sellable, 2 blocked until scanned.
- **T10 Starting stock, no cost:** 40 products entered without cost → "cost missing" to-do with 40; a sale of one shows "profit unknown"; a cashier cannot enter the cost.
- **T11 Order via WhatsApp:** order of 5 lines to S1 → WhatsApp opens with S1's number and the message filled in; order status Sent.
- **T12 Part receipt:** order of 10, receive 6 → order Part received with 4 open; close the remainder → Closed.
- **T13 USD:** $1,000 delivery at rate 129.5 → stock cost 129,500 KES; S1 owed $1,000.
- **T14 Cancel blocked:** cancelling a delivery where 1 item is sold → blocked, with an explanation.

## 11. Founders' answers
1. Orders are created and sent by **owner and manager only**.
2. Orders show **quantities only**, never prices.
3. Extra-cost categories: **both** "Transport & delivery" and "Clearing / customs".

## VAT is optional (founders' rule, 2026-10-31; applies to every feature)
- **Business setting "Charge VAT": OFF by default.** Most shops don't deal with VAT [F].
- **When OFF:** no VAT fields, no VAT on receipts. Profit = selling price − cost, exactly as typed.
- **When ON:** the app follows **KRA's rules** (rates such as 16% standard, exempt and zero-rated, and how VAT is shown and claimed). It doesn't invent its own. Products get a VAT type, delivery lines store their VAT amount, and profit is calculated without VAT.
