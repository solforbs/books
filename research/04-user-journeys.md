# 04 — User Journeys

These are proposed designs [I]. Each journey lists the **taps and typing the owner does**, what the app **does automatically**, and the **records created**. The goal is to minimise typing: scan, pick, confirm.

Personas (hypotheses [U]):
- **Amina**: owner. Checks the business on her phone in the evening.
- **Brian**: cashier/manager at the counter, using a phone or tablet with a camera scanner or a USB/Bluetooth barcode scanner.
- **The accountant**: an external person who opens QuickBooks monthly.

---

## J1. Stock-in: "A supplier delivered 20 phones and 50 chargers; I'll pay half now"

1. Brian taps **Receive stock** and picks the supplier. Recent suppliers are shown first, or he types 2 letters.
2. **Phones:** he scans or searches "iPhone 13 128 Blue". The app remembers the last cost from this supplier and prefills it. He scans 20 IMEIs one after another. The app:
   - validates each IMEI's check digit and rejects duplicates;
   - beeps and counts 1/20, 2/20, …;
   - offers "same cost for all" (the default), or editing a unit's cost.
3. **Chargers:** he scans the barcode once and types quantity 50. The cost is prefilled.
4. Optionally he types the supplier invoice number and snaps a photo of the paper invoice.
5. The payment question offers **Paid all / Pay later / Part paid**. He picks *Part paid*, enters the amount and picks the money place (Cash / Bank / M-Pesa).
6. He taps **Save**.

**Automatic:** stock goes up; each IMEI becomes a Unit with its own cost; the chargers' average cost is recalculated; the supplier balance goes up by the unpaid part; the money place goes down by the paid part; an accounting entry is generated; low-stock alerts clear.

**Records:** 1 receipt document, 20 unit records, 2 stock-movement lines, 1 supplier-ledger line, 1 payment, 1 journal (internal).

**Edge cases:**
- Unknown barcode → "Create product" opens inline: name, price, prefilled category, **3 fields**.
- A unit is faulty on arrival → mark the line "Damaged on arrival", which creates a supplier claim and not stock.
- Wrong cost entered and saved → **Edit receipt** creates a correction event. If units are already sold, the app shows how much past profit changes before confirming.

## J2. Sale: "Customer buys a phone and a case, pays partly cash, partly M-Pesa"

1. Brian scans the phone's IMEI. The app finds the exact unit, its variant and its price. Scanning the case's barcode adds it.
2. Optional: a discount, with a PIN if it's over the threshold.
3. **Pay** → Cash 40,000 + M-Pesa 30,000. The app shows the remainder live. For the M-Pesa part he optionally types the confirmation code; the last 4 characters are enough [I].
4. Customer: optional for a cash sale. Prompted (skippable) for IMEI sales so the warranty lookup works later.
5. **Done** → receipt printed or shared via WhatsApp/SMS, with the IMEI and warranty end date on it.

**Automatic:** unit → Sold, case quantity −1, sale recorded at the specific cost plus average cost, both money places updated, profit for today updated.

**Edge cases:**
- Scanning an IMEI that is already sold is blocked, with a message showing when and to whom it was sold.
- Selling an accessory with zero stock shows a warning. The sale goes through and is flagged "sold without stock" on the owner's to-do list.
- Offline: the sale is queued and syncs later. A serialised unit sold on two offline devices creates a conflict flag [I].

## J3. Credit sale and repayment: "Regular customer takes a laptop, pays 30% now"

1. Same as J2. At **Pay**, Brian enters 30% cash and taps **Rest on account**. The customer is **required**: pick one or quick-add name + phone.
2. Optional due date. Default from settings, e.g. 30 days.
3. **Later:** the customer returns with money. Brian goes to **Customers → Amina's customer → Receive payment**, enters the amount and money place, and the app applies it to the oldest debt.

**Automatic:** customer balance; "Who owes me" list sorted by overdue; an optional SMS/WhatsApp reminder template that the owner sends themselves.

**Edge cases:** a customer pays more than they owe → the extra is stored as customer credit. A credit limit per customer is Should Have.

## J4. Return / exchange / refund

1. **Returns** → scan the IMEI or receipt, or search by customer or phone number. The app finds the original sale, so the price and cost are known.
2. Choose the items being returned → **Condition**: *Resell* / *Inspect* / *Damaged* / *Back to supplier*.
3. **Settlement:** *Refund* (choose money place) / *Credit to customer account* / **Exchange**. Exchange opens the sale screen with the returned value as a credit; the customer pays or receives the difference.
4. Reason (pick list) and manager PIN if required.

**Automatic:** sale reversed at the **original** price and cost; unit status updated; refund paid from the chosen money place; customer balance adjusted.

**Edge cases:**
- Returns with no receipt → allowed only for the manager, priced at the current price, with a reason [I].
- Return after the warranty window → warning.
- A refund from the cash drawer that contains less cash than the refund → warning.

## J5. Expense and owner withdrawal

**Expense:** **+ → Expense** → category (Rent, Electricity, Transport, Airtime, Salaries, Repairs, Other; editable) → amount → paid from (money place) or **Not yet paid** → optional receipt photo → Save. Recurring expenses are Should Have.

**Owner withdrawal:** **+ → Owner took money** → amount → from (money place). The app explains in one line: "This lowers cash but is not a business expense, so profit doesn't change."

## J6. Stock count (discrepancy)

1. **Count** → choose *Phones* (by category) or *Everything*.
2. **Phones:** scan every IMEI on the shelf. The app shows *Expected 42 · Scanned 40 · Missing 2* and lists the 2 missing IMEIs with their last movement.
3. **Accessories:** scan or type counts. Rows with no difference are greyed out.
4. **Finish** → for each difference choose *Missing / Stolen / Damaged / Miscounted earlier (fix)*. Owner approval is required above a value threshold.

**Automatic:** adjustments valued at cost, a "Stock loss" line in profit reports, and a count history.

## J7. End of day: "Close the day"

1. **Close day** → the app shows expected cash in the drawer (opening float + cash sales + cash debt collections − cash refunds − cash expenses − withdrawals − cash supplier payments).
2. Brian types the counted cash. Any difference is recorded as *Cash over/short*, with an optional note.
3. Mobile money and bank: the app shows the expected inflows per method. Matching them against a statement is Should Have.
4. The summary goes to the owner's phone: **Sales, Gross profit, Expenses, Cash in, Owed to us (new), We owe (new), Stock value, Alerts.**

## J8. Owner's evening check (the ten questions)

The home dashboard is one screen with ten tiles; each tile opens a list:

| Question | Tile | Tap opens |
|---|---|---|
| What do I have? | Units / items in stock | Stock list with search and filters |
| Worth at cost? | Stock value at cost | By category |
| What did I sell today? | Today's sales | Sales list |
| How much did I make? | Gross profit · Net profit | Profit breakdown with a "why ≠ cash" explanation |
| How much cash? | Money in today, by method | Money places |
| Who owes me? | Customers owe X (Y overdue) | Debtors list |
| Whom do I owe? | Suppliers owed X | Creditors list |
| Missing / damaged / low? | Alerts count | To-do list |
| What to reorder? | Reorder suggestions | Reorder list, shareable to a supplier |
| How did the week/month go? | Period switcher (D/W/M/Y) | Same tiles for the period, versus the previous period |
