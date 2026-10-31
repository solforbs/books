# 08 — Recommended MVP Scope & Explicit Exclusions

> **Kenya update (2026-10-31): revised MVP.** The original scope below assumed a single-location phone shop. The revised recommendation, subject to Decisions 1–5 in [00-README](00-README.md):
>
> **Added to the MVP:**
> - all goods with pack units (KE-4);
> - retail and wholesale prices with trader customers and credit limits (CAT-6, KE-5);
> - supplier credit terms including *pay when sold*, plus "due now" (KE-1, KE-2);
> - neighbour sourcing, B1/B2 (KE-3);
> - multiple locations with transfers (USR-5), if Decision 5 allows;
> - two M-Pesa money places (KE-11) and roles (KE-12);
> - VAT per line and an eTIMS-ready data model (ACC-6, KE-7);
> - English and Somali (KE-10);
> - responsive UI (KE-15).
>
> **Gated:** invoice-photo stock-in (KE-6), included only if the accuracy test passes.
>
> **Moved out:** QuickBooks sync becomes Later; the accountant export stays in.
>
> **Release 2 at the latest:** eTIMS integration (KE-8), M-Pesa Daraja C2B matching (SAL-8), trade-ins (KE-13), and borrowed/lent neighbour stock (KE-3 B3/B4).
>
> **Later:** repairs (KE-14).


## Target customer (hypothesis to validate)
A **single-location electronics shop** selling phones, laptops and accessories:
- 1–5 staff;
- cash, card and mobile-money payments;
- some customers on credit and some suppliers who give credit;
- currently using (or paying an accountant who uses) QuickBooks Online.

## The MVP in one sentence
*Scan stock in, scan stock out, get paid any way, and the owner knows stock, profit, cash, debts and losses every evening. The accountant gets matching books.*

## In scope (MVP)

| Area | Included | Requirement IDs |
|---|---|---|
| Catalogue | Products/variants, serialised versus quantity, CSV/XLSX import with opening stock, barcode/IMEI search and scan | CAT-1…5 |
| Stock-in | One-screen receiving, IMEI rapid scan, last-cost prefill, paid/later/part | STK-1…4 |
| Sales | Scan to cart, split tender, part pay with the rest on account, discounts with PIN, receipts with IMEI | SAL-1…6 |
| Returns | By receipt or IMEI; refund, credit or (two-step) exchange; condition-based restock | RET-1…3 |
| Losses and counts | Write-offs with reasons; IMEI scan count; accessory count | ADJ-1…2 |
| Money | Money places, expenses, owner withdrawal/contribution, transfers, close day | MON-1…5 |
| Reports | Ten-question dashboard, period report, cash-versus-profit bridge, stock value, low stock, IMEI history, CSV export | REP-1…5, REP-7, REP-8 |
| Users | Owner/Manager/Cashier, PINs, immutable log, hidden costs | USR-1…3 |
| Accounting | Internal journal, account mapping, accountant summary export | ACC-1…3 |
| QuickBooks | **Option 1 (recommended):** export only in the MVP and QBO sync in release 2. **Option 2:** daily-JE sync in the MVP if Decision 4 says so | ACC-4 |

## Explicit exclusions (and why)

| Excluded | Why |
|---|---|
| Multi-location and transfers | Target is single-location; adds a lot of complexity [I] |
| Repairs / job tickets | A different product (RepairDesk's domain) |
| Trade-ins / buybacks | Valuable for phone shops but needs legal/ID checks [U]; Later |
| Purchase orders to suppliers | Receiving covers the accounting need; POs are a "Should" |
| Bundles, wholesale price lists, loyalty | Should/Later |
| Mobile-money and bank API integrations | Country-specific; manual method selection first |
| Payroll, tax filing, multi-currency, fixed assets | Accountant/QBO territory |
| E-commerce storefront | Not the problem we are solving |
| QBO per-item inventory sync, InventoryAdjustment API | Conflicts with per-IMEI costing; US-only endpoint [V-s] |
| QuickBooks Desktop | No evidence the target uses it [U] |
| "AI" features | No evidence of need. Reorder suggestions use simple arithmetic. Receipt OCR only if testing shows typing supplier invoices is a real burden |

## Automation that *is* justified
- IMEI check-digit validation and duplicate blocking.
- Last-cost and last-supplier prefill.
- Sales-velocity reorder list (Should).
- Automatic journal and daily summary.
- Nightly reconciliation checks with a to-do list.
- Receipt photo capture, stored as an attachment only (no OCR in the MVP).

## Success metrics for the pilot (proposed)
- Median time to record a sale is ≤ 10 s (scan to receipt).
- Receiving 20 IMEIs takes ≤ 2 min.
- The owner answers all 10 questions without help, in usability testing with 5 owners.
- Month-end: our five reconciliation lines match the accountant's books with zero unexplained differences, in 3 pilot shops.
- Zero duplicate postings to QBO (if sync is in scope).
