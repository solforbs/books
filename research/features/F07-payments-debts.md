# F07 — Paying Suppliers & Receiving Customer Payments

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F03 Suppliers (payment rules, USD, offset), F06 Selling (customers, credit rules).
All founders' answers to the F07 questions were "default"; they are written in below.
VAT optional; KRA fields optional; approvals only when the business has non-approver staff.

## 1. Purpose
Record money going to suppliers and coming from customers in **one simple step**, so the app always shows the true answers to "**whom do I owe, who owes me, what is due now**".

## 2. Simple flows

### 2.1 Pay a supplier (owner or manager)
**Suppliers → [supplier] → Pay** → the screen shows **Due now 150,000 · Total owed 400,000** → type the amount (buttons: *Due now* / *All*) → **from**: Cash drawer / M-Pesa / Bank → reference (optional: M-Pesa or bank code) → **Save**.
The money goes to the **oldest due delivery first**. "Choose deliveries" lets the user pick instead (F03).

### 2.2 Receive a customer's debt payment (owner, manager, cashier)
**Customers → [customer] → Receive payment** → shows **Owes 30,000 (10,000 overdue)** → amount → method → for M-Pesa, **the code is required** (same rule as sales, F06) → **Save** → **Send receipt?** WhatsApp / SMS / Print / No. The receipt shows the amount paid and the **new balance**.
The payment goes to the **oldest sale first**; "Choose sales" lets the user pick instead.

### 2.3 Send a statement
**[customer or supplier] → Statement** → period (default: everything not yet paid, or last 3 months) → **WhatsApp / PDF / Print**. It lists each sale or delivery, each payment, and a running balance.

## 3. Rules

### 3.1 Money places
- The payment reduces (supplier) or increases (customer) the chosen money place: the cash drawer of the **current location**, M-Pesa Till, Paybill or bank linked to it (F02).
- **Not enough cash in the drawer** for a supplier payment → warning: "Drawer has 12,000". Only owners and managers can continue (the drawer goes negative and is flagged for day close).
- References: optional for supplier payments; **M-Pesa code required** for customer M-Pesa payments (duplicate codes blocked, as in F06).

### 3.2 Overpaying and paying in advance
- **Paying a supplier more than owed** (rare; suppliers are normally paid when goods arrive or later on credit [F]) → the extra is kept as **"advance with supplier"**. It is used automatically against the next delivery from that supplier (F04 shows "Advance 200,000 will be used").
- **A customer pays more than owed, or pays before buying** → **"customer credit"**, used automatically on their next credit sale or at checkout ("Use credit 5,000?").
- Advances and credits can be **refunded** (owner or manager).

### 3.3 USD suppliers
As agreed in F03:
- the amount is entered in **USD**, plus the **KES actually spent**;
- the rate is pre-filled and editable;
- any difference shows on the **exchange gain/loss** line, separate from profit.

### 3.4 Discounts on payment (owner or manager only)
- **Discount received:** a supplier accepts 95,000 for a 100,000 debt → pay 95,000 and tick "discount 5,000". The debt is cleared, and "discount received" increases profit.
- **Discount given:** a customer owes 1,050 and pays 1,000; the shop forgives 50 → "discount given 50". The debt is cleared, and the discount reduces profit.
- A reason is optional. Who and when are always recorded.

### 3.5 Writing off a customer debt (owner only)
- **Customer → Write off** → amount (all or part) → reason (moved away, refused, died, other) → confirm.
- It shows in reports as **"bad debt" (a loss)**, on its own line.
- If the customer **pays later anyway**, the payment is recorded as "**debt recovered**", which reverses that loss.

### 3.6 Offsetting (supplier who is also a customer)
As in F03 §6: one step cancels what each side owes the other.

### 3.7 Corrections
The same rule as sales (F06):
- the person who recorded the payment can correct or cancel it **within 6 hours** without a PIN;
- after that, a manager or owner can, on the same day;
- **after the day is closed: no edits.** Record a new correcting payment instead.

The original is always kept.

### 3.8 Statements and checking against the supplier
- Customer statements are ready to send (§2.3).
- **Supplier check:** when a supplier says "you owe me 420,000" but the app says 400,000, open **Statement → Compare**:
  - type the supplier's figure;
  - the app shows the difference;
  - the app lists recent deliveries and payments to check.

  Nothing changes until someone corrects a delivery or payment.

## 4. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Pay a supplier | ✔ | ✔ | ✖ | ✖ | ✖ |
| Receive a customer payment | ✔ | ✔ | ✔ | ✖ | ✖ |
| Discount received/given on payment | ✔ | ✔ | ✖ | ✖ | ✖ |
| Write off a customer debt | ✔ | ✖ | ✖ | ✖ | ✖ |
| Refund advance/credit | ✔ | ✔ | ✖ | ✖ | ✖ |
| Send statements | ✔ | ✔ | ✔ (customers) | ✖ | view |

## 5. Offline and multi-location
- Works **offline**; syncs later.
- **Two devices record a payment for the same debt while offline** → both are kept (they could be genuine). If together they overpay, the extra becomes credit or an advance and the owner is notified to check.
- **The same M-Pesa code on two devices** → flagged after sync (F06).
- Balances are **business-wide**. The payment records the location and money place used.

## 6. Edge cases (checklist)
1. Paying a delivery whose price is still **pending** (F04) → only the known part can be paid; the rest waits.
2. Paying a supplier with **only "not yet due"** amounts → allowed (early payment); oldest first.
3. A customer pays with M-Pesa to the **Paybill of another location** → the money place is the Paybill, not the location's drawer. The location is where the payment was recorded.
4. A payment amount of 0 or negative → not allowed.
5. A customer's debt was partly written off, then the customer pays all → "debt recovered" for the written-off part; the rest goes to normal debt.
6. A supplier gives goods back instead of money for an advance → handled in F08 (supplier returns/credits).
7. A refund of customer credit in cash with too little cash in the drawer → warning; owner or manager only.
8. A statement for a customer with hundreds of lines → PDF; the WhatsApp text shows the summary plus the latest 20 lines.
9. The customer's phone number is missing → the receipt can't be sent by WhatsApp or SMS; print or skip.
10. Paying a supplier in KES when their account is in USD → enter KES; the app suggests the USD equivalent at today's rate (editable).

## 7. Test examples (acceptance)
- **T1 Supplier, oldest first:** deliveries A (due 30,000) and B (due 50,000); pay 40,000 from Bank → A 0, B 40,000; bank −40,000.
- **T2 Customer payment with receipt:** K1 owes 30,000; pays 15,000 M-Pesa with code → owes 15,000; WhatsApp receipt shows "New balance 15,000".
- **T3 Duplicate code:** a customer payment using an M-Pesa code already used on a sale → blocked.
- **T4 Advance:** pay supplier S2 200,000 before an order → "Advance 200,000"; next delivery of 250,000 → the advance is used, owed 50,000.
- **T5 Discount received:** owe 100,000; pay 95,000 + discount 5,000 → owe 0; profit report shows discount received 5,000.
- **T6 Write-off and recovery:** K2 owes 20,000; the owner writes it off → bad debt 20,000. K2 pays 5,000 later → debt recovered 5,000.
- **T7 Correction window:** a cashier records a payment and corrects it after 2 hours without a PIN → ok. After 7 hours → "Ask a manager or owner".
- **T8 Supplier compare:** the supplier says 420,000; the app says 400,000 → the difference of 20,000 is shown with recent items listed; no change until corrected.
- **T9 USD payment:** owe $2,000 at a delivery rate of 130; pay $2,000 with 264,000 KES → owe $0; exchange loss 4,000 (separate line).
- **T10 Customer credit used:** K3 has credit 5,000; a new sale of 12,000 → "Use credit 5,000?" yes → pay 7,000.

## 8. Founders' answers
1. Suppliers are paid **when goods arrive, or mostly on credit**. Paying before the goods arrive is not a normal flow, so there is no special "pay in advance" screen. An accidental overpayment still becomes an advance (§3.2).
