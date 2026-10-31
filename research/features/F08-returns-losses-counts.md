# F08 — Returns, Warranty, Losses, Stock Counts & Supplier Returns

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01–F07.
All founders' answers to the F08 questions were "default"; they are written in below.
VAT optional; KRA fields optional; approvals only when the business has non-approver staff.

## 1. Purpose
Handle everything that makes stock or money **go backwards**: customer returns and exchanges, warranty claims, damaged, stolen, missing and used items, stock counts, and goods sent back to suppliers. The owner can then always trust the stock numbers and see **exactly what was lost, why, and by whom**.

## 2. Simple flows

### 2.1 Customer return or exchange
**Returns → find the sale:** scan the **IMEI**, scan or type the **receipt number**, or search the customer's phone.
→ tick the items coming back (quantity)
→ **where does it go?** Back to stock · Check first · Damaged · Back to supplier
→ **what does the customer get?** **Exchange** (opens a new sale with the value as credit) · **Credit for later** (customer required) · **Refund** (owner/manager; choose cash, M-Pesa or bank)
→ reason (pick: changed mind, faulty, wrong item, other) → **Done** → return receipt (Print/WhatsApp/SMS).

### 2.2 Warranty claim (faulty item within warranty)
**Returns → Warranty** → scan the IMEI or serial → the app shows the sale date, warranty end and **"In warranty ✔"** →
- **Replace now:** scan a new unit of the same product → the customer leaves with it. The faulty unit becomes **"Faulty, claim with supplier"**.
- **Send for repair:** the customer's item is logged as **"With us for repair"** (it is the customer's, not our stock), with a ticket printed or sent by WhatsApp. Its status moves through *at supplier / repairer* → *ready* → *returned to customer*.

### 2.3 Damaged / stolen / missing / used in shop
**Stock → Remove stock** → scan or pick the item(s) → reason → optional photo and note → **Save**.
Owner or manager: done immediately. Other staff: saved as a **report** for the owner or manager to approve. While waiting, the item is **not sellable**.

### 2.4 Stock count
**Stock → Count** → **Full** (everything at this location) or **Part** (choose category, products, or "phones only") → count:
- **Phones and serial items:** scan every IMEI on the shelf.
- **Other goods:** scan barcodes or type quantities.

→ **Finish** → the app shows the differences → for each difference choose **Missing · Stolen · Damaged · Count again** → **Save**.
Items found (more than expected) go back into stock automatically.

### 2.5 Return goods to a supplier
**Suppliers → [supplier] → Return goods** → scan or pick the items (only goods that came from this supplier are offered first) → reason → **outcome:** **Reduce what I owe** · **Supplier refunds money** (choose money place) · **Supplier will replace** → **Save**. Optional: send a WhatsApp message listing the returned items.

## 3. Rules

### 3.1 Customer returns
- **Policy (owner settings):**
  - *exchange or credit* can be done by anyone allowed;
  - *refund (cash, M-Pesa or bank)* only by an owner or manager;
  - **return time limit** set by the owner (default 7 days); after the limit, an owner or manager is needed.
- **The IMEI must match** the IMEI on the original sale. A different phone (e.g. a swapped or fake one) is **blocked**: "This IMEI was not sold on this receipt".
- **Amount returned = what the customer actually paid** for that item, after discounts (a cart discount is shared across items by value).
- **Credit sales:** the return first **reduces what the customer still owes**; only the rest becomes a refund or credit.
- **Can't return more than was sold** (minus earlier returns).
- **Returns without a receipt:** phones are found by IMEI. Other goods without a receipt → owner or manager only; they choose the price.
- **Where it goes:**
  - **Back to stock:** sellable again at its **original cost**.
  - **Check first:** held, not sellable, in a "to check" list. Then → stock or damaged.
  - **Damaged:** stock loss (§3.3).
  - **Back to supplier:** creates a supplier return draft (§3.5).
- **Reports:** a return is shown **on the day it happens** (sales and profit go down that day). The original day's figures don't change.
- **Supplier effects:** a returned item from a "pay as you sell" or "after all sold" supplier delivery reduces "sold" again (F03 §4.1).
- **Exchange price difference:** if the new item costs more, the customer pays the difference (any method or credit). If less, the difference becomes a refund (owner/manager) or credit.
- The **same day within 6 hours** for a simple mistake → use **Correct sale** (F06) instead. Returns are for goods actually coming back.

### 3.2 Warranty
- **Warranty end** = sale date + the product's warranty months (F01). Outside warranty → "Warranty ended on <date>"; an owner or manager can still accept it.
- **Replace now:**
  - the new unit leaves stock with **no new sale amount**;
  - the faulty unit enters stock as **"Faulty, claim with supplier"** (not sellable);
  - profit is unchanged until the supplier claim ends. If the supplier refuses, the faulty unit becomes a **stock loss**.
- **Repair:** the customer's item is **not** in stock value. A list shows all items "with us" and how long they've been there. A repair charge (if any, out of warranty) is a normal sale line "Repair service" [I].
- The warranty claim links to the supplier return (§3.5) for the faulty unit.

### 3.3 Damaged / stolen / missing / used in shop
- **Reasons:** Damaged · Stolen · Missing · Used in shop · Given free (promotion). The owner can add reasons.
- Valued at **cost** (IMEI exact cost; quantity goods oldest delivery first).
- **Reports:** a separate **"Stock loss"** line, by reason and by person. **Not mixed into the cost of goods sold**, so gross profit stays honest.
- **Who:** owner and manager directly. Other staff create a **report** that needs approval. Approvals only appear when such staff exist.
- **Photo:** optional.
- The removal records person, time, location and device. Nothing is deleted. An undo is a reverse entry by an owner or manager, with a reason.

### 3.4 Stock counts
- **Blind count for staff:** cashiers and storekeepers **don't see the expected number**. Owners (and managers if allowed) see it.
- **Phones:** scanning IMEIs gives **named results**: "Expected 42, scanned 40. Missing: IMEI …518 (last seen: received 3 Oct), IMEI …204 (last seen: moved to Shop 2?)".
  - Scanning an IMEI that the app says is **sold** or at **another location** → it is flagged for checking.
- **Counting while the shop is open:** each item's count records the time it was counted. Sales or receipts of that item **after** it was counted are taken into account, so selling during a count doesn't create false differences.
- **Several people counting at once** (different shelves, different phones) → their counts are **added together**. The same IMEI scanned twice counts once.
- **Finishing:**
  - every difference needs a decision (Missing / Stolen / Damaged / Count again);
  - **found items** go back into stock at the **last known cost** (or "cost missing" if none, F04);
  - staff-run counts need owner or manager approval before stock changes.
- **Reminders:** the owner sets how often, e.g. phones daily, accessories weekly. A reminder appears in the to-do list on the day.
- A count can be **paused** and continued later (saved automatically). An abandoned count can be cancelled with no change to stock.

### 3.5 Returns to suppliers
- Items offered first are those received from this supplier. For IMEIs, the app knows the exact delivery.
- **Outcomes:**
  - **Reduce what I owe:** the supplier debt goes down by the item's cost (for USD suppliers: in USD).
  - **Supplier refunds money:** money place +; if more than owed, an advance (F07).
  - **Supplier will replace:** an open **claim**. The replacement is received through F04 as "**Replacement for claim #…**", which adds stock at the **original cost** and **no new debt**. Claims open for a long time are listed for the owner.
- **Claims from receiving** (short or damaged on arrival, F04 §4.2) are handled here in the same way.
- The goods leave stock when sent. If the supplier rejects the return, it is undone (back to stock, or a loss) by an owner or manager.

## 4. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Return: exchange or credit | ✔ | ✔ | ✔ (within time limit) | ✖ | ✖ |
| Return: refund money | ✔ | ✔ | ✖ | ✖ | ✖ |
| Return after the time limit / without receipt (non-IMEI) | ✔ | ✔ | ✖ | ✖ | ✖ |
| Warranty: replace / repair ticket | ✔ | ✔ | ✔ | ✖ | ✖ |
| Remove stock (damaged etc.) | ✔ | ✔ | report only | report only | ✖ |
| Approve reports / counts | ✔ | ✔ | ✖ | ✖ | ✖ |
| Count stock | ✔ | ✔ | ✔ (blind) | ✔ (blind) | ✖ |
| Return goods to supplier | ✔ | ✔ | ✖ | ✔ (outcome set by owner/manager) | ✖ |

## 5. Offline and multi-location
- Everything works offline and syncs later.
- **A return on one device while another device sells the same returned IMEI offline** → flagged after sync for the owner.
- Counts belong to one location. A count must be finished on one device (others contribute scans).

## 6. Edge cases (checklist)
1. A customer returns an item bought at another location → allowed. It goes into stock at the location where it is returned.
2. Return of an item that was part of a **reservation/deposit** sale → normal return of the final sale.
3. Return of a sale paid partly with customer credit → the credit part goes back as credit.
4. A refund with too little cash in the drawer → choose another method, or owner/manager only.
5. Returning an item whose cost was **missing** → back to stock with the cost still missing.
6. A warranty replacement when **no unit of the same product is in stock** → offer "Send for repair", or an exchange for another product with the difference paid or refunded.
7. A warranty claim for an item sold **before the shop started using the app** (no sale record) → owner or manager can create it manually with the IMEI and sale date.
8. A count started, then a delivery arrives for the same items → the delivery is added after the count time (§3.4), no false difference.
9. A count finds an IMEI the app has **never seen** → flagged: "Unknown phone". Options: receive it (F04) or ignore.
10. A large stock loss (over an owner-set value, e.g. 50,000) → the owner is notified even if a manager approved it.
11. Supplier returns of USD goods → the debt is reduced in USD at the original delivery's value.
12. A customer returns a free promotional item (price 0) → nothing to refund; back to stock.

## 7. Test examples (acceptance)
- **T1 Exchange:** a customer returns a charger (paid 1,000) and takes earphones at 1,500 → returned value 1,000 as credit, pays 500; charger back to stock.
- **T2 IMEI mismatch:** returning a phone whose IMEI differs from the receipt → blocked.
- **T3 Credit-sale return:** K1 bought 60,000 on credit and owes 40,000; returns the item (60,000) → debt 0, credit or refund 20,000 (refund only by owner/manager).
- **T4 Cashier refund blocked:** a cashier chooses Refund → needs owner or manager.
- **T5 Warranty replace:** a phone sold 2 months ago (12-month warranty) → replace now with a new IMEI → the new unit leaves stock without a sale; the old unit becomes "Faulty, claim with supplier"; no profit change.
- **T6 Damaged by cashier:** a cashier reports 1 charger damaged → status reported, unit not sellable; the manager approves → stock loss 450 (cost), reason Damaged, by the cashier.
- **T7 Blind IMEI count:** a storekeeper scans 40 of 42 → sees "40 scanned" only; the owner sees the 2 missing IMEIs with their last movement.
- **T8 Selling during a count:** charger counted at 10:00 as 20; 2 sold at 10:30; the system had 22 at 10:00 → no difference.
- **T9 Found items:** a count finds 3 more cases than expected → +3 at the last cost.
- **T10 Supplier return, reduce debt:** return 2 faulty phones (cost 95,000 each) to S1 → S1 owed −190,000.
- **T11 Replacement claim:** S1 will replace 1 phone → claim open; replacement received via F04 "for claim #12" → stock +1 at 95,000, no new debt, claim closed.
- **T12 Stock loss report:** monthly report shows stock loss by reason (Stolen 2, Damaged 5) and by person, separate from cost of goods sold.

## 8. Founders' answer (small, from selling)
1. **Free accessories with a phone** (e.g. "free cover and screen protector with every phone"): in F06, a price of 0 needs a manager PIN. Should the owner be able to mark some products as **"can be given free with a sale"** (no PIN), recorded as "Given free (promotion)"? **Answer: yes.** See F01 (the "Can be given free" field) and F06 edge case 11.
