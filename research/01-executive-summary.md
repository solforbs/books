# 01 — Executive Summary & Problem Definition

## The problem in one paragraph

Small electronics shops sell a mix of **high-value, individually identifiable devices** (phones and laptops with serial numbers or IMEIs, each bought at a slightly different cost) and **low-value, high-volume accessories** (chargers, cases, cables). They use QuickBooks because "the accountant needs it". But QuickBooks Online treats inventory as a side feature of accounting:

- Inventory tracking needs the Plus or Advanced plan [V].
- It has no native serial-number tracking [S].
- It allows overselling into negative stock with no setting to stop it [S, and Intuit's own help article describes the causes [V]].
- Stock is only counted as received once a *bill* is recorded [V].

The owner wants answers to simple questions: *What do I have? What did I make? Who owes me? Whom do I owe? What's missing?* Today they get them through accounting forms and terminology they don't use day to day.

## What we propose to build

An **inventory-first shop app**:

- The main screens are *Receive stock*, *Sell*, *Return*, *Count* and *Pay / Get paid*.
- Every one of these actions automatically produces the matching accounting records in the background, using double entry that the owner never has to see.
- The owner's home screen answers the ten questions from the brief directly. See [08-mvp-scope.md](08-mvp-scope.md).
- QuickBooks becomes an **optional downstream ledger for the accountant**. It is fed with summarised, de-duplicated journal entries rather than being the place where the shop works.

## Key findings

1. **Nobody we studied combines all three of these:** simple daily workflows, per-IMEI tracking and automatic accounting for a small shop.
   - Loyverse is very simple and its basic inventory is free, but it has no native customer credit; the community works around it with custom payment types [V]/[S].
   - Lightspeed and Zoho have serial tracking [V], but they are broader retail/ERP tools.
   - RepairDesk tracks IMEIs and trade-ins but is built around repairs [V].
   - Square has good stock-adjustment reasons. Theft, damage and loss adjustments do not appear in its COGS report [V-s], which shows that *shrinkage must be reported separately from COGS* (a design lesson for us).
2. **POS → QuickBooks integrations usually send summaries, not every sale.**
   - Lightspeed offers three modes: Journal Entry (daily summary), Summary Sales Receipt and Itemized Sales Receipt. It can book inventory and COGS by journal [V].
   - Intuit's own Square connector moved from summary receipts to individual transactions, which upset some users [S].
   - This is the strongest evidence for how we should integrate.
3. **The QuickBooks API is usable but has constraints that matter for this market.**
   - The `InventoryAdjustment` endpoint is documented for Plus/Advanced **US** companies only [V-s].
   - Write calls are free and read calls are metered under the App Partner Program (launched for US partners in July 2025) [S, citing official Intuit announcements].
   - Idempotent writes are supported via the `requestid` parameter [V-s], which matters for preventing duplicates.
   - Limits are 500 requests per minute per company plus concurrency limits [V-s].
4. **Electronics shops need two costing methods.** Each serialised device needs its own cost (*specific identification*). Accessories can use a running cost (FIFO or weighted average). QuickBooks Online uses FIFO only [V-s]. If QuickBooks also tracks quantities, its COGS will **disagree** with ours for phones. This is the main technical reason to keep inventory in our app and send summaries to QuickBooks.

## What "success" means for the MVP

- A new product can be created in **under 15 seconds** (scan or type, set price, done). A received box of 20 phones can be booked by scanning 20 IMEIs, with no other typing per unit.
- A sale takes **scan → pick payment method → done** for the common case.
- At close of day, the owner sees: sales, gross profit, cash by method (cash, card, mobile money, bank), new customer debts and new supplier debts. All of it is **reconciled** to the drawer count.
- Each month, the accountant gets books in which revenue, COGS, inventory value and payables/receivables **match** our app, with no duplicates.

## What we are explicitly not building (MVP)

Payroll, tax filing, multi-currency, full general-ledger editing, manufacturing, an e-commerce storefront, repairs/job tickets, multi-location transfers and AI features. See [08-mvp-scope.md](08-mvp-scope.md).
