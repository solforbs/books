# F03 — Suppliers & Credit Rules

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01 Products, F02 Locations & Staff (both approved).
Not in this feature: recording deliveries (F04), paying suppliers (F07), returning goods to suppliers (F08). This feature defines the supplier list and the **rules** those features follow.
KRA fields are **optional everywhere**; the first version works without them.

## 1. Purpose
Keep one clean list of everyone the shop buys from, including neighbour shops. Record each supplier's **payment rule**, so the app can always say: **how much do I owe, to whom, and how much must I pay now?**

## 2. Simple flows

### 2.1 Add a supplier (owner or manager)
**Suppliers → +** → name → phone → payment rule (pick one, §4) → Save.
"More" (optional): KRA PIN, market or location, currency (KES/USD), notes, "Neighbour shop" tick.

### 2.2 See what I owe
**Suppliers** opens a list, sorted with **due now** at the top. Each row shows: name · total owed · **due now** · next due date.
Tap a supplier → their deliveries, each with: amount, paid, owed, **% sold**, due status.

### 2.3 Starting balance (when the shop joins)
**Supplier → Starting balance** → amount → currency → due date → Save.

### 2.4 Offset (a contact who is both supplier and customer)
**Contact → Offset** → the app shows "You owe them 80,000 · They owe you 50,000" → **Offset 50,000** → both balances drop by 50,000. Recorded with who did it and when.

## 3. Supplier details

| Field | Required? | Notes |
|---|---|---|
| Name | Yes | |
| Phone | Yes | Unique: the same phone number on another supplier is blocked |
| Payment rule | Yes | Default: Cash (§4) |
| Currency | Yes | KES (default) or USD |
| Neighbour shop | No | Tick. Neighbour shops appear first when "getting goods from another shop" (F09) |
| KRA PIN | **No** | Used later for eTIMS purchases |
| Market / location, notes | No | e.g. "Eastleigh", "Dubai" |
| Also a customer | System | The same contact can also be a customer (F06); balances are shown separately |

**Who can add or edit:** Owner and Manager. **Duplicates:** the same phone number is blocked; a similar name gives a warning (as in F01).

## 4. Payment rules (flexible: match whatever the supplier agreed)

The owner picks **one rule per supplier**. It can be **changed on any single delivery** (F04).

| Rule | Example of what the supplier says | When the money is due |
|---|---|---|
| **Cash** | "Pay me now" | On delivery |
| **Pay within a time** | "Pay me in 1 month" / "in 2 weeks" / "in 3 months" (any number of days, weeks or months) | Delivery date + that time |
| **Pay as you sell** | "Pay me for each phone when you sell it" | Each item's cost becomes due when it is sold |
| **Pay after all sold** | "Pay me when the whole delivery is finished" | When the last item of that delivery is sold |
| **After sold, but with a latest date** | "Pay when you sell, but not later than 3 months" | When sold **or** on the latest date, **whichever comes first** |

Simple explanation of "whichever comes first": a supplier says *"pay after you sell, but don't keep my money longer than 3 months"*. If everything sells in 3 weeks, you pay at 3 weeks. If some items haven't sold after 3 months, you must still pay for them at 3 months.

**Deposit:** any rule can start with a part payment on delivery ("I paid 50,000 now, the rest later").

### 4.1 How the app works out "due now" (in the background)
- **IMEI/serial items:** the app knows exactly which delivery each unit came from.
- **Quantity items (chargers etc.):** sales are counted against the **oldest delivery first**, automatically. The user is never asked (founders: keep it simple).
  - *Example:* 10 chargers from Delivery A, then 10 from B. The first 10 sold count against A.
- **Due now** = all amounts whose due point has passed (date reached, item sold, delivery finished, or latest date reached) **minus** payments already applied.
- **Returns:**
  - **from customers:** a returned item that goes back to stock reduces the "sold" amount again;
  - **to the supplier:** goods returned to the supplier reduce the debt (F08).

### 4.2 Partial payments
- A payment reduces the **oldest due delivery first** by default.
- The person paying can **choose which delivery** (or deliveries) to pay instead.
- A payment larger than what is owed → the extra is kept as **credit with that supplier**, used against the next delivery.

### 4.3 Reminders (in the app, for owner and managers)
- 3 days before a due date; on the due date; when overdue (then weekly).
- For "pay as you sell": a weekly summary, e.g. "You sold items worth 120,000 from Supplier X, now due".

## 5. US dollars (USD)
- A supplier can be in **USD** or **KES**. A single delivery can also be in USD.
- **Exchange rate on a USD delivery:**
  - The app **pre-fills** the day's reference rate.
  - Possible sources: the Central Bank of Kenya publishes daily rates [V-s], and free daily-rate APIs (e.g. Frankfurter) list KES [S]. These are **daily, not real-time** [S].
  - **The user can always change it** to the rate they really got (bank, forex bureau or agent rates usually differ [I]).
  - Offline → the last rate used is pre-filled.
- **What is stored:**
  - the **debt stays in USD** (e.g. owe $2,000);
  - the **stock cost is in KES** at the delivery's rate (2,000 × 130 = 260,000).
- **Paying a USD debt:** enter the USD amount paid and the **KES actually spent**.
  - The difference against the delivery rate is shown as **exchange gain/loss on a separate line next to profit**, not mixed into it (in simple words: "you paid 4,000 more because the dollar went up").
- **Supplier list:** USD suppliers show the USD balance plus "≈ KES at today's rate".

## 6. Contacts who are both supplier and customer
- One contact record, with two balances: **You owe them** and **They owe you**.
- **Offset** cancels the smaller amount against the larger, as one recorded step.
- If the currencies differ, offset is only allowed after the user enters a rate.

## 7. Starting balances
- Per supplier: amount, currency, and a due date (or "no date").
- Starting balances use **dates only**. They are not linked to particular products, because the old goods may not be identifiable [I]. If a shop needs "pay after sold" for old goods, it can link them when entering starting stock (F04).

## 8. Offline and multi-location
- The supplier list is shared across the business.
- Suppliers added offline sync later. Two devices adding the same phone number → after sync, the second is flagged for the owner or manager to merge (as in F01).
- Balances and "due now" are calculated per business, not per location. Deliveries record the location they arrived at.

## 9. Edge cases (checklist)
1. A supplier's rule is changed after deliveries exist → only **new** deliveries use the new rule; old deliveries keep theirs (each delivery can be edited by the owner, with history).
2. "Pay after all sold", and one item from the delivery was damaged or stolen (written off) → it counts as "finished" for this purpose, and **the debt for it remains**. You still owe for goods you lost.
3. "Pay as you sell", and the item is returned by the customer → the due amount goes down; if already paid, the extra becomes credit with the supplier.
4. A neighbour shop is both supplier and customer → offset (§6).
5. Payment made in KES to a USD supplier → the user enters the USD equivalent (the app suggests it at today's rate, editable).
6. Exchange rate not available (offline, first time) → the user must type it; no default is invented.
7. Starting balance entered twice → warning if the supplier already has a starting balance.
8. A supplier is deleted → not possible; **hidden** only, and only when the balance is zero.
9. A supplier gives a discount for paying early → recorded at payment time as "discount received" (F07).
10. A storekeeper or cashier receives a delivery from a **new** supplier → they type the name, and it is saved as a **waiting** supplier. Receiving is not blocked. An owner or manager completes and approves it later. (No approval appears in a shop with no non-approver staff, see below.)

## 10. Test examples (acceptance)
- **T1 Pay within time:** rule "2 months"; delivery on 1 Jan of 100,000 → due 1 Mar; on 25 Feb a reminder shows "due in 3 days".
- **T2 Pay as you sell:** delivery of 10 phones at 50,000 each; 3 sold → due now 150,000; pay 100,000 → due now 50,000; owed in total 400,000.
- **T3 After all sold:** delivery of 20 chargers; 19 sold → due now 0; the 20th sold → due now = full amount minus payments.
- **T4 Whichever first:** "after sold, latest 3 months"; delivery on 1 Jan of 10 phones; 4 sold by 1 Apr → on 1 Apr the whole unpaid amount (all 10) is due.
- **T5 Oldest-first payment:** deliveries A (due 30,000) and B (due 50,000); pay 40,000 → A cleared, B due 40,000. Choosing B instead → B due 10,000, A still 30,000.
- **T6 USD:** delivery of $2,000 at rate 130 → stock cost 260,000 KES, owed $2,000. Pay $2,000 spending 264,000 KES → balance 0; exchange loss 4,000.
- **T7 Offset:** owe neighbour N1 80,000; N1 owes us 50,000 → offset → owe 30,000, owed 0.
- **T8 Duplicate phone:** adding a supplier with an existing supplier's phone → blocked.
- **T9 Overpayment:** owe 20,000, pay 25,000 → balance 0, credit 5,000 with that supplier.
- **T10 Written-off item:** "after all sold"; 9 sold and 1 written off as damaged → full delivery due.

## 11. Open questions for the founders
1. **New supplier while receiving:** only owners and managers can add suppliers. When a **storekeeper** receives goods from a supplier who isn't in the list, what should happen?
   - (a) The storekeeper types the supplier name, and it is saved as **"waiting"** for a manager to complete and approve (receiving is not blocked); or
   - (b) the storekeeper must call a manager to add the supplier first.
   *Default suggestion: (a).*
2. **Quantity items sold oldest delivery first (§4.1):** is that how traders think about it? Or would they rather tell the app "these chargers came from Supplier X"?
3. **Exchange gain/loss:** is showing it as part of profit okay, or would owners rather see it separately?

## Approvals only when they are needed (applies to F01, F02, F03 and every later feature)
- **A shop run by the owner alone, or only by owners and approving managers, never sees an approval step.** Everything they add is active immediately, and no "waiting" lists or badges appear.
- Approval steps appear only once the business has staff who are **not** approvers (e.g. a cashier or storekeeper). They then apply only to what those staff add.
- Many shops are run by one or two people [F], so this keeps the app simple for them.

## 12. Founders' answers
1. New supplier while receiving: **(a)**, saved as waiting, receiving not blocked. Approvals only apply when the business has non-approver staff (see above).
2. Quantity items: **oldest delivery first, automatic, no extra questions.**
3. Exchange gain/loss: **a separate line** next to profit.