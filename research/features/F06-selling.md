# F06 — Selling (with customers, credit, deposits and quotations)

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01–F05 (approved).
Not in this feature: receiving customer payments later (F07), returns and exchanges after the day closes (F08), selling from a neighbour's stock (F09), automatic M-Pesa matching (later), eTIMS invoices (F13; the sale data is eTIMS-ready).
Approvals only appear when the business has non-approver staff. KRA fields are optional.

## 1. Purpose
Sell **fast** (scan → pay → done), take any mix of payments, sell on credit to known customers, take deposits to reserve goods, and send quotations. Stock, money, debts and profit all update by themselves. The cashier never sees cost or profit unless allowed.

## 2. Simple flows

### 2.1 Normal sale (most sales)
1. **Sell** → scan or search items.
   - Scanning an **IMEI** picks that exact phone.
   - Scanning a **barcode** adds 1 (scan again for +1).
   - Scanning a **carton barcode** adds a carton.
2. (Optional) change a price (bargaining) or quantity. (Optional) add a customer.
3. **Pay** → tap a method: Cash / M-Pesa Till / M-Pesa Paybill / Bank / Card. Split across methods is possible.
   - **Cash:** optionally type the cash given; the app shows the **change**.
   - **M-Pesa:** the app **prompts for the M-Pesa code** (e.g. QJK7XXXXXX). See §5.2.
4. **Done** → receipt: Print / WhatsApp / SMS / No receipt.

### 2.2 Credit sale
Same as above. At Pay, enter what is paid now (can be 0), then tap **Rest on credit**. A customer is **required** (pick, or quick-add name + phone). Their payment rule applies (§6).

### 2.3 Park a sale
**Park** → the cart is saved with a label (e.g. "Man in blue shirt"). Serve the next customer. **Parked** shows the list; tap one to continue.

### 2.4 Reserve with deposit (founders: in the first version)
In the cart, tap **Reserve** → customer (required) → deposit amount → collect-by date → payment method → Done. Receipt: "Deposit receipt".
When the customer returns: **Reservations → tap → Collect** → pay the rest → normal sale receipt.

### 2.5 Quotation
In the cart, tap **Quote** → customer (name/phone) → valid until (default 7 days) → **Send on WhatsApp** (or print/PDF). Later: **Quotes → tap → Turn into sale**. Prices are taken from the quote while it is valid.

## 3. The sale screen
- **Top bar:** location · **Retail / Wholesale** switch · customer chip.
- **Cart rows:** product name (IMEI shown for phones) · qty · unit (piece / carton) · price · line total. Tap a row to edit qty or price, or remove it.
- **Bottom:** total (VAT amount shown small only if the business has VAT on) · **Pay** · More (Park, Reserve, Quote, cart discount).
- **No cost or profit is shown** to cashiers (owner can allow it per person, F02).

## 4. Prices and discounts
- The price comes from the **location's price list** (F02). It switches to **Wholesale** automatically for **trader customers**. A cashier can switch Retail/Wholesale by hand if allowed.
- **Per-location price** overrides apply (F01).
- **Bargaining:** the cashier types a new price on the row, or a **cart discount** (amount or %).
  - Going **below the minimum price** (F01: owner's minimum, or the cost if none is set) needs an **owner or manager PIN on the same device**. The approval is recorded.
- **A waiting product with no price** (F01): the cashier types a price for this sale; the sale is flagged for review.
- **Quotation prices** are honoured until the quote's valid-until date.

## 5. Payments

### 5.1 Methods
- Cash (the location's drawer), M-Pesa Till, M-Pesa Paybill, Bank transfer, Card (optional; goes to the chosen bank account). Only methods linked to the current location are shown (F02).
- **Split payment:** any number of methods, e.g. Cash 20,000 + M-Pesa 46,000. The app shows the remaining amount live; Done appears when the remainder is 0 (or the rest is on credit).

### 5.2 M-Pesa code
- After choosing M-Pesa, the app **asks for the transaction code**, in large text: "Enter M-Pesa code from the customer's message". **Required** (founders' decision).
- **The full code (10 letters and digits)** is needed, not only the last 3 characters (see the founders' answers below for why). To make it quick: capital letters are automatic; on the shop's own phone the code can be **pasted** from the M-Pesa SMS; once automatic M-Pesa matching arrives, the cashier just taps the matching payment.
- **The same code used before** in the business → blocked: "Code already used on sale #123, 14:05 today". If this happens offline on two devices, it is flagged after sync.
- Automatic matching with real M-Pesa payments comes later (Daraja C2B).

### 5.3 Change
If cash given > amount, the app shows **Change: 1,500** in big text. Change is never recorded as a payment.

## 6. Customers and credit
- **Customer record:** name and phone (required); type **Normal** or **Trader** (trader = wholesale prices); KRA PIN optional (for buyers who want to claim VAT later with eTIMS); notes.
  - The same phone number is blocked as a duplicate.
  - A contact can also be a supplier (F03).
- **Payment rules for customers:** the **same flexible rules as suppliers** (F03):
  - Cash;
  - Pay within a time (any days, weeks or months);
  - Pay as you sell;
  - Pay after all sold;
  - After sold with a latest date.

  The rule is set per customer and can be changed per sale. ("As you sell" is common for retailers buying from a wholesaler [F].)
- **Credit limit (optional):** a credit sale that takes the customer over the limit needs an **owner or manager PIN**.
- **Starting balances:** when the shop joins, the owner enters what each customer already owes (amount + due date).
- **Reminders:** the owner and managers see overdue customers. A ready-made WhatsApp reminder message is available; the user taps Send. Nothing is sent automatically.

## 7. Stock rules at sale
- **IMEI/serial items:** only units **in stock at this location** can be sold.
  - Units that are reserved, in a parked sale, waiting for an IMEI scan (F04/F05), or at another location → blocked with the reason (e.g. "At Store — move it first").
  - No stock → "Get from neighbour" (F09) or "Receive first".
- **Other goods with 0 in the system:** allowed with a warning, flagged "**sold without stock**" for the owner. The stock goes negative until corrected by a delivery or count.
- **Parked sales hold IMEI units** (no one else can sell that phone). They don't hold quantity items.
- **Reservations hold** the reserved IMEI units and quantities. They are not available to others.
- Selling a carton reduces pieces by the pack size (F01).

## 8. Deposits / reservations (in the first version)
- **The deposit is not a sale yet.** The money is in the drawer/M-Pesa, recorded as "**customer deposits**" (money we hold for the customer). It is not profit.
- The reserved goods stay in stock but are **held**.
- **Collect:** becomes a normal sale; the deposit counts as part of the payment; profit is recorded on that day.
- **Collect-by date passed** (default **7 days** after reserving, changeable per reservation): the owner and managers see it in the to-do list. Options: extend the date, **cancel and refund** (the default; what most shops do [F]), or cancel and keep the deposit (owner or manager only, with a reason).
- **Partial collection** (the customer reserved 2 phones and takes 1): allowed; the deposit is applied first.
- A deposit can be topped up (the customer pays more before collecting).

## 9. Receipts
- **Print** (58 mm / 80 mm Bluetooth printer), **WhatsApp**, **SMS**, or **No receipt**. The language follows the location's setting (F02).
- Shows: business name, location, date/time, cashier, receipt number, items (IMEI or serial and **warranty end date** for those items), prices, discounts, total, VAT (only if VAT is on), payments (method + M-Pesa code), change, credit balance (for credit sales), and the customer if given.
- **Reprint / resend** at any time from the sale.
- When eTIMS arrives (F13), the receipt becomes the eTIMS invoice (QR code etc.).

## 10. Corrections (founders: allowed on the same day only)
- **A cashier can correct or cancel their own sale within 6 hours without a PIN** (founders' decision), as long as the day isn't closed yet.
- **After 6 hours**, a clear message: "This sale is more than 6 hours old. Ask a manager or owner to correct it." The manager or owner can correct it (same day).
- **An owner or manager** can correct or cancel any sale until the day is closed (F11).
  - The original sale is **kept**, marked "corrected" or "cancelled", with who, when and why. Stock, money and debts are reversed and redone automatically.
- **After the day is closed:** no edits. Use **Return / Exchange** (F08).
- If no day close is done, the day ends at midnight [I].
- **eTIMS note:** once eTIMS is connected, a sent invoice can't be changed at KRA. A same-day correction will then send a credit note and a new invoice in the background. The user still sees one simple "Correct sale" action.

## 11. Profit (background)
- **VAT is optional** (off by default, see the end of this spec). **With VAT off:** profit = selling price − cost. **With VAT on:** KRA's rules apply, and profit is calculated without VAT.
- Profit per line = selling price − cost (both without VAT when VAT is on):
  - **IMEI:** that unit's exact cost;
  - **quantity items:** cost of the oldest delivery's goods first, matching F03 §4.1.
- "**Cost missing**" or "**price pending**" items → "profit unknown" (F04).
- Selling a "pay as you sell" supplier's goods moves that cost to **due now** for the supplier (F03).

## 12. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Sell, take payments | ✔ | ✔ | ✔ | ✖ (owner can allow) | ✖ |
| Change price above the minimum / cart discount | ✔ | ✔ | ✔ (owner can switch off) | — | — |
| Below the minimum price | ✔ | ✔ | PIN | — | — |
| Credit sale | ✔ | ✔ | ✔ (owner can switch off) | — | — |
| Over the credit limit | ✔ | ✔ | PIN | — | — |
| Add customer | ✔ | ✔ | ✔ | — | — |
| Reserve / quote | ✔ | ✔ | ✔ | — | — |
| Correct / cancel a sale (same day) | ✔ | ✔ | own sales within 6 h; otherwise manager | — | — |
| See cost / profit | ✔ | if allowed | if allowed | — | view |

## 13. Offline and multi-location
- Selling works **fully offline**; sales sync later.
- **The same IMEI sold on two offline devices** → after sync, the second sale is flagged; the owner decides (usually the second becomes "sold without stock" and is investigated).
- **The same M-Pesa code on two offline devices** → flagged after sync.
- Credit limits are checked against the balance known on that device; an offline over-limit sale is flagged after sync.

## 14. Edge cases (checklist)
1. Scanning an IMEI that is already sold → "Sold on <date> to <customer>"; it can't be added.
2. Scanning an IMEI that is at another location → shows where it is.
3. A customer pays more than the total by M-Pesa → the extra is **change owed**. The cashier gives cash change (recorded), or it becomes customer credit if the customer is selected.
4. The split payment doesn't cover the total and the cashier tries Done → blocked unless the rest goes on credit (customer required).
5. A credit sale with no customer → blocked.
6. A sale of a waiting (unapproved) product → allowed, flagged (F01).
7. A parked sale left at day end → day close lists it: continue tomorrow or cancel. Held IMEIs are released if cancelled.
8. A reservation with an IMEI that turns out faulty → the owner or manager can swap it for another unit of the same product.
9. A deposit is refunded with a different method than it was paid → allowed; recorded.
10. A quote has expired → turning it into a sale uses current prices, with a notice.
11. Price set to 0 → for products marked **"Can be given free"** (F01): allowed without a PIN, recorded as "Given free (promotion)" at cost. For other products: treated as below the minimum (PIN), with the reason asked.
12. Two items in the cart are the same product, one at retail and one at wholesale price → allowed (prices are per line).
13. VAT on, with VAT-exempt and VAT items in the same sale → VAT calculated per line, following KRA rules.
14. The phone goes offline mid-sale → nothing is lost; the sale finishes offline.
15. The receipt printer isn't connected → offer WhatsApp/SMS instead; reprint later.
16. A customer wants a receipt under a business name / KRA PIN → edit the customer or add the PIN before Done (needed for eTIMS later).

## 15. Test examples (acceptance)
- **T1 Fast cash sale:** scan charger (1,000) twice → qty 2, total 2,000; Cash, given 5,000 → change 3,000; stock −2; receipt printed.
- **T2 IMEI sale (VAT off):** scan IMEI A (cost 95,000) at 110,000, M-Pesa with code entered → unit Sold; profit 15,000; the receipt shows IMEI A and warranty end.
- **T3 Duplicate M-Pesa code:** reusing a code from an earlier sale → blocked with that sale's number.
- **T4 Split + credit:** total 66,000; Cash 20,000 + M-Pesa 16,000; rest 30,000 on credit to K1 → K1 owes 30,000 with their rule's due date.
- **T5 Credit limit:** K1 limit 50,000, owes 40,000; a new credit sale of 20,000 → PIN required.
- **T6 Below minimum:** minimum 9,000, cashier types 8,500 → PIN required; approval logged.
- **T7 Park:** park cart with IMEI B; another cashier scans IMEI B → "In a parked sale"; cancel the parked sale → IMEI B sellable.
- **T8 Deposit:** reserve IMEI C (price 60,000), deposit 20,000 cash → drawer +20,000, customer deposits 20,000, no sale, IMEI C held. Collect with 40,000 M-Pesa → sale 60,000, deposit cleared, profit recorded on the collection day.
- **T9 Quote:** quote 2 cartons at wholesale 12,000 each, valid 7 days → sent on WhatsApp; on day 3, turn into sale at 24,000 even though the price changed to 12,500.
- **T10 Same-day correction:** a sale recorded as Cash by mistake; a manager corrects it to M-Pesa → drawer −, M-Pesa +, the original kept as "corrected".
- **T11 After day close:** trying to edit yesterday's sale → not possible; Return/Exchange offered.
- **T12 Sold without stock:** charger shows 0, sell 1 → warning, sale done, flagged; stock −1.
- **T13 Offline double IMEI:** two offline phones sell IMEI D → after sync, the second sale is flagged for the owner.

## 16. Founders' answers
1. **M-Pesa code required.** The founders suggested typing only the last 3 characters. **The full code is needed**, because:
   - M-Pesa codes are unique only as a **whole 10-character code**. The last 3 characters have only about 46,000 possible combinations.
   - A shop taking about 300 M-Pesa payments would almost certainly see two different payments ending in the same 3 characters. The app would then wrongly block a genuine payment as a "duplicate".
   - To keep typing low: automatic capitals, paste from SMS, and automatic matching later.
2. A cashier corrects their own sale **within 6 hours without a PIN**; after that, a clear message and a manager or owner is needed. Nothing can be edited after the day is closed.
3. Deposits: **refund** by default; keeping a deposit needs an owner or manager and a reason. The collect-by default is 7 days.
4. VAT: **optional, off by default**. When on, KRA's rules apply (see below).

## VAT is optional (founders' rule, 2026-10-31; applies to every feature)
- **Business setting "Charge VAT": OFF by default.** Most shops don't deal with VAT [F].
- **When OFF:** no VAT fields, no VAT on receipts. Profit = selling price − cost, exactly as typed.
- **When ON:** the app follows **KRA's rules** (rates such as 16% standard, exempt and zero-rated, and how VAT is shown and claimed). It doesn't invent its own. Products get a VAT type, delivery lines store their VAT amount, and profit is calculated without VAT.
