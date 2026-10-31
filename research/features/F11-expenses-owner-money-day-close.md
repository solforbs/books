# F11 — Expenses, Owner Money, Moving Money & Closing the Day

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F02 (money places, cash drawers), F04–F10 (everything that moves money).
All founders' answers to the F11 questions were "default", plus two additions: an automatic midnight close **with next-day approval**, and a **PDF** day summary (daily first; weekly and monthly when there is data).

## 1. Purpose
Record the money that isn't sales or stock (expenses, salaries, owner money, cash moved to the bank), and **close each day** so the owner knows the cash is right and gets a **daily PDF summary**.

## 2. Simple flows

### 2.1 Expense
**+ → Expense** → type (Rent, Electricity, …) → amount → **paid from** (Cash drawer / M-Pesa / Bank) or **Not paid yet** → optional photo of the receipt, note → **Save**.

### 2.2 Salary and staff advance
- **Staff advance:** **+ → Staff advance** → staff member → amount → from → Save. The staff member now "owes" this until payday.
- **Pay salary:** **+ → Pay salary** → staff member → salary amount (remembered from last time) → the app shows "**Advance to deduct: 3,000 → pay 17,000**" → from → Save.

### 2.3 Owner money (owner only)
**+ → Owner took money** or **Owner put money in** → amount → from/to (money place) → Save.
A short line explains: "This changes cash, not profit."

### 2.4 Move money
**+ → Move money** → from (e.g. Cash drawer) → to (e.g. Bank, or Safe) → amount → fee if any → Save.
Examples: cash to the bank; M-Pesa withdrawal to cash; Paybill settled to the bank; the day's cash to the **Safe**.

### 2.5 Close the day (per location)
**Close day** → one screen:
1. **Today at a glance:** sales, profit, money in by method, expenses, owner money.
2. **Things to finish** (each one tap): parked sales, neighbours to pay, borrowed items, deposits due, waiting approvals, transfers on the way. The day can still be closed with items open; they move to tomorrow's list.
3. **Count the cash:** "Cash should be **48,500**" → type what is in the drawer → **difference** shown: "Short 500" or "Over 200" → optional note.
4. **Cash staying for tomorrow** (float) → the rest is moved to the Safe or the Bank in the same step (optional).
5. Optional: type the **M-Pesa balance** to compare with what the app expects.
6. **Close** → the day is locked (G5) → **daily PDF summary** created.

## 3. Rules

### 3.1 Expenses
- **Starting list of types:** Rent, Electricity, Water, Salaries, Transport & delivery, Clearing/customs, Airtime & internet, Security, Repairs, County permit & licences, Bank & M-Pesa charges, Other. The owner can add, rename or hide types.
- **Not paid yet** → shown in "**We owe**" next to supplier debts, with an optional due date. It is paid later like a supplier payment (F07).
- **Monthly reminders:** the owner can mark an expense as monthly (e.g. rent on the 1st). The app **reminds**; it never pays automatically.
- **Who:** owner and manager. **Cashiers:** small expenses **from the cash drawer only**, up to a limit the owner sets (default 1,000). Above the limit → owner or manager.
- An expense **reduces profit**. Expenses created by other features (transport in F04/F10, fees on money moves) appear here too.

### 3.2 Salaries and advances
- An **advance is not an expense**. It's money the staff member owes back.
- When the salary is paid:
  - the **full salary** is the expense;
  - the advance is deducted;
  - only the remainder leaves the money place.
- An advance larger than the salary → the rest carries to the next payday.
- A staff member who leaves while owing an advance → the owner chooses to forgive it (it becomes an expense) or keep it as owed.
- **Who:** owner (managers if allowed).

### 3.3 Owner money
- **Owner took money** (personal use) and **Owner put money in** never touch profit. Each owner's total is tracked separately (several owners, F02).
- The owner **taking the day's cash home for safekeeping is not a withdrawal**. Use **Move money → Safe**, because it is still business money.
- **Who:** owners only.

### 3.4 Money places added by this feature
- **Safe / Cash at home** (business cash kept outside the drawer): one per business, or one per location (owner chooses). It behaves like any money place.

### 3.5 Moving money
- From and to any money places; a **fee** (bank or M-Pesa charge) becomes an expense "Bank & M-Pesa charges".
- **Paybill linked to the bank** (F02): when the Paybill money arrives in the bank, record **Paybill → Bank**.
- Moves never change profit (except the fee).

### 3.6 Closing the day
- **Expected cash** in the drawer =
  - **plus:** opening float + cash sales + cash debt payments + cash deposits taken + cash moved in;
  - **minus:** cash refunds, cash expenses, cash supplier/neighbour payments, staff advances and salaries in cash, owner withdrawals in cash, and cash moved out.

  (The app shows this as a short list on tap: "why 48,500?")
- **Short / over** is recorded with the person who counted, and appears in reports (F12). Large differences (owner sets an amount, default 2,000) notify the owner.
- **The opening float for tomorrow** = what was left in the drawer.
- **Who closes:** owner or manager (cashiers if the owner allows). One close per location per day. **No shifts** in the first version.
- **Locked after close:** no edits to that day (G5). Returns and corrections happen on later days.
- **One-person shop** (G1): the same screen, just without "waiting approvals".

### 3.7 Automatic close at midnight (founders' rule)
- If nobody closes the day, it **closes automatically at midnight**:
  - the day is locked;
  - the PDF is created;
  - the cash is **not counted**.
- **Next day, the first time an owner or manager opens the app:** a clear banner: "**Yesterday (Tue 31 Oct) was closed automatically. Review and approve.**" Tap → the same close screen for that date:
  - review the figures;
  - optionally count the cash now (the count is recorded as "counted next morning");
  - **Approve**.
- Until approved, the day shows **"Closed automatically – not approved"** in reports, and the reminder stays (it can't be dismissed without approving). **The day is locked** like any closed day (founders' decision). Approval is only a review and an optional cash count.
- Several unapproved days (e.g. after a holiday) → listed oldest first; each must be approved.

### 3.8 Day summary PDF
- **Daily PDF (priority):** created at every close (manual or automatic). One page where possible:
  - date, location (or all locations), who closed it;
  - **sales**, **profit** (or "profit incomplete" if costs are missing), sales by staff member;
  - **money in by method** (cash, Till, Paybill, bank, card) and money out (expenses, supplier payments, owner money);
  - cash count: expected, counted, short/over;
  - **debts:** new customer credit, customer payments received, new supplier debt, supplier payments; totals still owed both ways;
  - **stock:** value at cost, stock losses today, items sold from neighbours;
  - **alerts:** low stock, overdue debts, unapproved items, unclosed days.
- **Business-wide PDF:** when the business has several locations, a combined PDF is created when all locations are closed (or at midnight), with one line per location plus totals.
- **Weekly and monthly PDFs:** available once the app holds data for that period (a full week or month). The same layout with daily rows.
- **Delivery:** the owner gets an in-app notification **"Day summary ready"** → open, save, or **Share** (e.g. to WhatsApp, done by the owner). No automatic messages.

## 4. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Expense | ✔ | ✔ | from drawer, up to limit | ✖ | ✖ |
| Staff advance / pay salary | ✔ | if allowed | ✖ | ✖ | ✖ |
| Owner took / put in money | ✔ | ✖ | ✖ | ✖ | ✖ |
| Move money | ✔ | ✔ | drawer → safe only, if allowed | ✖ | ✖ |
| Close day | ✔ | ✔ | if allowed | ✖ | ✖ |
| Approve automatic close | ✔ | ✔ | ✖ | ✖ | ✖ |
| See / share PDFs | ✔ | ✔ (own locations) | ✖ | ✖ | ✔ view |

## 5. Offline
- Expenses, moves and day close work offline. The PDF is created on the device and synced.
- A sale recorded offline for a day that was already closed on another device → after sync, it is added to that day as a **late entry**. The day is marked "**changed after close**" and the owner is asked to re-approve.
- An automatic close happens on each device at midnight. The final day result is combined after sync.

## 6. Edge cases (checklist)
1. An expense larger than the cash in the drawer → warning; owner or manager only (the drawer would go negative).
2. A cashier's expense over the limit → blocked: "Ask manager or owner".
3. A day closed with a big shortage → the owner is notified; the shortage is shown in reports under the person who counted.
4. Closing the day with a parked sale → the sale stays parked into tomorrow (F06).
5. Closing a day for one location while another location is still open → allowed; the business PDF waits.
6. A day with no activity → auto-close still runs, and approval is a single tap ("no activity").
7. Unpaid electricity (not paid yet) → appears in "We owe"; paying it later doesn't create a second expense.
8. An owner withdrawal from M-Pesa → M-Pesa place −; profit unchanged.
9. A move typed by mistake → G5 correction rules; after close, a new opposite move.
10. A staff member with an advance is switched off → the owner is asked "forgive or keep owed".
11. Weekly PDF requested for a week with only 3 days of data → it says "partial week (3 days)".

## 7. Test examples (acceptance)
- **T1 Expense:** rent 25,000 from Bank → bank −25,000, expenses +25,000, profit −25,000.
- **T2 Cashier limit:** a cashier records 800 for airtime from the drawer → ok; 1,500 → blocked.
- **T3 Advance and salary:** advance 3,000 on the 10th; salary 20,000 on the 30th → expense 20,000; cash paid 17,000; advance 0.
- **T4 Owner withdrawal:** the owner takes 5,000 from the drawer → drawer −5,000, profit unchanged, "Owner took" +5,000.
- **T5 Cash to safe at close:** expected 48,500; counted 48,500; float 5,000; 43,500 moved to Safe → drawer 5,000 tomorrow.
- **T6 Short:** expected 48,500, counted 48,000 → short 500, by <name>; appears in the day PDF.
- **T7 Automatic close:** nobody closes Tue → locked at midnight; Wed morning the manager sees "Tue closed automatically – review and approve"; counts cash, approves → status Approved.
- **T8 Daily PDF:** after close, the PDF contains sales, profit, money by method, cash count, debts, stock value, alerts; the owner shares it to WhatsApp.
- **T9 Late offline sale:** a sale made offline on Tue syncs on Wed → added to Tue as a late entry; Tue marked "changed after close"; re-approval requested.
- **T10 Move with fee:** M-Pesa → Cash 10,000 with fee 100 → M-Pesa −10,100, Cash +10,000, expense 100.

## 8. Founders' answers
1. An automatically closed day is **locked** while it waits for approval; approval is a review and cash count.
2. The money place name **"Safe / Cash at home"** is approved.
