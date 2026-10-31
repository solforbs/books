# 10 — Acceptance Criteria & Test Scenarios

All amounts are in the shop's currency (no currency symbol). Requirement IDs refer to [05](05-requirements.md).

## Shared fixture

- **Phone X 128GB Black**: serialised, retail price 65,000.
- **Charger 20W**: quantity item, retail price 1,000, low-stock threshold 5.
- Supplier **S1**. Customer **K1**.
- Money places: **Cash drawer**, **M-Pesa till**, **Bank**.
- Costing: per-IMEI exact cost for phones; moving average for chargers.

---

## AC-1 Fast product creation (CAT-1, CAT-3)
- **Given** a category "Accessories" with default accounts, **when** the user scans an unknown barcode and enters name and price, **then** the product is created in ≤ 3 fields and is immediately sellable.
- No account field is shown anywhere on the product form.

## AC-2 Import (CAT-4)
- **Given** a sheet with 200 rows (name, barcode, price, qty, cost), 3 duplicate barcodes and 2 rows with a missing price, **when** imported, **then** the preview shows 195 valid rows, 3 duplicates and 2 errors. Confirming creates 195 variants and **one** opening-stock event whose value = Σ(qty × cost).
- Re-importing the same file creates no duplicates.

## AC-3 Receiving with IMEIs and pay-later (STK-1, STK-2, STK-4)
- **When** S1 delivers IMEI A (cost 50,000) and IMEI B (cost 52,000), marked *Pay later*:
  - stock is 2 units;
  - stock value is 102,000;
  - S1 is owed 102,000;
  - no money place changes.
- Scanning `490154203237518` is accepted (valid check digit). Scanning `490154203237519` is rejected as invalid.
- Scanning IMEI A a second time in any receipt is rejected as a duplicate.

## AC-4 Moving-average cost (STK-1)
- Receive 10 chargers @ 500 paid from the Cash drawer, then 10 @ 700 paid from Cash.
- **Then:** on hand is 20; average cost is 600; stock value is 12,000; the Cash drawer is down 12,000.

## AC-5 Split-tender sale (SAL-1, SAL-2)
- Sell IMEI B at 65,000 plus 1 charger at 1,000. Payment: Cash 40,000 + M-Pesa 26,000.
- **Then:**
  - IMEI B status = Sold;
  - chargers on hand = 19;
  - sales = 66,000;
  - COGS = 52,000 + 600 = 52,600;
  - gross profit = 13,400;
  - Cash +40,000, M-Pesa +26,000.
- The receipt shows IMEI B and the warranty end date.
- Scanning IMEI B in a new sale is blocked with "Sold on <date> to <customer/walk-in>".

## AC-6 Credit sale and repayment (SAL-3)
- Sell IMEI A at 60,000; pay Cash 20,000; rest on account. **When** no customer is selected, **then** completion is blocked.
- With K1 selected: K1 owes 40,000; gross profit for this sale = 10,000; Cash +20,000.
- K1 later pays 15,000 via M-Pesa → K1 owes 25,000; M-Pesa +15,000; **profit unchanged**.
- K1 pays 30,000 → K1 has a credit of 5,000 (an overpayment is stored, not lost).

## AC-7 Return with refund (RET-1, RET-3)
- Return the charger from AC-5 as *Resell*, refunding 1,000 in cash.
- **Then:** chargers on hand +1 at cost 600; sales −1,000; COGS −600; Cash −1,000.
- Returning the same receipt line twice is blocked.

## AC-8 Return of a device to inspection
- Return IMEI B as *Inspect*, refund 65,000 from the Bank.
- **Then:** IMEI B status = Inspecting (not sellable); sales −65,000; COGS −52,000.
- Inspection result "Faulty" → status Damaged; **stock loss** +52,000 (not COGS).

## AC-9 Write-off and loss reporting (ADJ-1)
- Write off 1 charger, reason *Damaged*.
- **Then:** on hand −1; stock loss +600; COGS unchanged; the event records the user and reason.
- **When** a cashier attempts it, **then** a manager PIN is required.

## AC-10 IMEI count (ADJ-2)
- **Given** 42 phones expected in stock, **when** 40 IMEIs are scanned and the count is finished, **then** the app lists exactly the 2 unscanned IMEIs.
- Resolving them as *Missing* creates 2 write-offs at their exact costs.
- Scanning an IMEI that the system shows as Sold raises a "Found sold unit" warning.

## AC-11 Expense and owner withdrawal (MON-2, MON-3)
- Rent 10,000 from Cash → expenses +10,000, net profit −10,000, Cash −10,000.
- Owner takes 5,000 from Cash → Cash −5,000; **net profit unchanged**; shown under "Owner withdrawals".

## AC-12 Close day (MON-5)
- **Given** opening float 5,000; cash sales 60,000; cash refunds 1,000; cash expenses 10,000; withdrawals 5,000: **expected** = 49,000.
- Counted 48,500 → *Cash short* 500 is recorded, along with the user.

## AC-13 Dashboard and cash-versus-profit bridge (REP-1, REP-3)
- For any day, every tile equals the sum of the underlying events (property test over randomised event sequences).
- **Bridge identity:** net profit + COGS + stock loss − stock received at cost (cash *and* credit) − Δ customer debts + Δ supplier and other payables − withdrawals + contributions = Δ money places.
  The bridge must reconcile exactly (difference = 0) for every period.

## AC-14 Journal integrity (ACC-1)
- Over randomised sequences of 10,000 events: Σ debits = Σ credits.
- The Inventory account balance = Σ(cost of IMEIs in stock) + Σ(qty × avg) for accessories.
- A/R balance = Σ customer balances. A/P balance = Σ supplier balances.

## AC-15 Permissions (USR-1, USR-3)
- A cashier cannot see cost, profit or the owner dashboard. A discount above the threshold, a refund or a write-off requires a manager PIN.
- Every event carries user, device and timestamp. No event can be deleted; corrections are reversals.

## AC-16 Accountant export (ACC-3)
- The monthly export's account totals equal the period report's figures. Re-exporting gives byte-identical output for a locked month.

## AC-17 QBO sync idempotency (ACC-4, if in scope)
- A network failure after the request but before the response leads to a retry with the same `requestid`. **Then** exactly 1 JournalEntry `SHOP-YYYYMMDD` exists in QBO.
- A late return dated the previous day **updates** that day's JE (or posts one correction JE, per the configured policy). The total JE count stays one per day (plus at most one correction per day).
- **Given** the accountant edits the JE in QBO, **when** the nightly read-back runs, **then** a "QBO differs" review item is raised and nothing is overwritten automatically.

## AC-18 Low stock (REP-5)
- When chargers fall from 6 to 5 (threshold 5), the low-stock alert appears; it clears when stock is received.

---

## Kenya update: additional scenarios

## AC-19 Sell from neighbour (KE-3 B1)
- **Given** 0 iPhone 13 Pro in stock, **when** the cashier chooses *Get from another shop*, picks neighbour N1, enters cost 95,000, scans an IMEI and sells at 100,000 (M-Pesa), **then**:
  - the sale profit = 5,000;
  - N1 is owed 95,000;
  - stock on hand afterwards = 0;
  - IMEI history shows "From N1 → sold to <customer>".
- The daily summary shows "Sold from neighbours: 1, profit 5,000, owed to neighbours 95,000".

## AC-20 Pay-when-sold supplier (KE-1)
- Receive 10 chargers @ 600 from S2 on *Pay when sold*. **Then** S2 is owed 6,000, all *not yet due*.
- Sell 4 → *due now* = 2,400, *not yet due* = 3,600.
- Pay S2 2,000 → *due now* = 400.

## AC-21 Credit limit (KE-5)
- Trader customer T1 has a limit of 100,000 and owes 80,000. A credit sale of 30,000 is blocked unless a manager or owner approves; the approval is logged.

## AC-22 Pack units and wholesale price (KE-4, CAT-6)
- Product: earphones; carton = 50; retail 300 each; wholesale 12,000 per carton.
- Receive 2 cartons → 100 pieces. Wholesale sale of 1 carton to T1 → 50 left, sales 12,000. Retail sale of 3 pieces → 47 left, sales 900.

## AC-23 Location transfer (USR-5)
- Send 5 IMEIs from Store to Shop 2 → they show *in transit*, sellable nowhere.
- Shop 2 confirms 4 received and 1 missing → 4 in Shop 2 stock; 1 raised as a transfer discrepancy for the owner.
- The business-wide stock value is unchanged until the discrepancy is resolved.

## AC-24 M-Pesa code (KE-11, SAL-2)
- Entering an M-Pesa transaction code already used on another sale is rejected. Till payments increase the "M-Pesa Till" place; Paybill payments increase "M-Pesa Paybill", which clears to Bank on settlement.

## AC-25 Invoice-photo stock-in (KE-6, if in scope)
- On a test set of real supplier invoices, the median number of fields corrected per invoice is ≤ 2 (accuracy gate).
- If the line totals ≠ the invoice total, saving is blocked until the difference is fixed or explicitly accepted.
- After the trader maps "IP13PRO 256 GRY" once for supplier S1, the next invoice from S1 auto-matches it.
- Nothing is saved without the user tapping Confirm.

## AC-26 VAT (ACC-6)
- A VAT-inclusive retail price of 1,160 at 16% → net sales 1,000, VAT payable 160. Profit uses net sales.

## AC-27 Language (KE-10)
- Every screen, receipt and message template is available in English and Somali. Switching language does not change any data.
