# 05 — Functional Requirements

Priority: **Must** = the MVP is not viable without it; **Should** = high value, can follow within 1–2 releases; **Later** = only once there is evidence of demand.
IDs are referenced from [10-acceptance-criteria.md](10-acceptance-criteria.md).

## A. Catalogue
| ID | Requirement | Priority |
|---|---|---|
| CAT-1 | Create a product/variant with name, sell price and (optional) barcode in ≤ 3 fields; the category supplies the defaults | Must |
| CAT-2 | Variants by free attributes (storage, colour, condition) | Must |
| CAT-3 | Mark a variant as **serialised** (IMEI/serial per unit) or **quantity** | Must |
| CAT-4 | Import products and opening stock (with cost) from CSV/XLSX: column mapping, preview, duplicate detection, a single opening-stock event | Must |
| CAT-5 | Search by name, barcode, IMEI or serial; camera barcode scan; external USB/Bluetooth scanner | Must |
| CAT-6 | Retail and wholesale price; customer-type price lists | **Must** (Kenya update) |
| CAT-7 | Bundles (sale item consumes components) | Should |
| CAT-8 | Product photos | Later |

## B. Stock-in and suppliers
| ID | Requirement | Priority |
|---|---|---|
| STK-1 | Single "Receive stock" action: supplier, lines, cost, payment status (paid / later / part) | Must |
| STK-2 | Rapid IMEI scan entry with check-digit validation and per-shop uniqueness | Must |
| STK-3 | Prefill the last cost per supplier and variant | Must |
| STK-4 | Supplier balances, partial payments, payment history | Must |
| STK-5 | Attach a photo of the supplier invoice | Should |
| STK-6 | Landed costs spread across lines | Should |
| STK-7 | Purchase orders sent to suppliers (WhatsApp/PDF) | Should |
| STK-8 | Return to supplier / warranty swap | Should |

## C. Sales and payments
| ID | Requirement | Priority |
|---|---|---|
| SAL-1 | Scan-to-cart; IMEI scan selects the exact unit | Must |
| SAL-2 | Payment methods mapped to money places; split tender | Must |
| SAL-3 | Part payment with the rest on a customer account (customer required) | Must |
| SAL-4 | Block selling unavailable serialised units; warn and flag for accessories | Must |
| SAL-5 | Discounts with permission thresholds | Must |
| SAL-6 | Receipt (print / share), showing IMEI and warranty end | Must |
| SAL-7 | Offline sales with later sync and conflict flags | Should [U: depends on connectivity research] |
| SAL-8 | M-Pesa Daraja C2B (Till and Paybill): incoming payments listed for one-tap matching | **Should** (Kenya update; MVP = typed M-Pesa code with duplicate check) |
| SAL-9 | Layaway / deposits that reserve a unit | Later |

## D. Returns and adjustments
| ID | Requirement | Priority |
|---|---|---|
| RET-1 | Return by receipt or IMEI, reversing the original price and cost | Must |
| RET-2 | Settlement: refund, customer credit or exchange | Must (exchange as a single flow: Should) |
| RET-3 | Returned item condition sets the unit's next status | Must |
| ADJ-1 | Write-off with a mandatory reason and user; reported as "Stock loss", not COGS | Must |
| ADJ-2 | Stock count: IMEI scan for serialised items, quantity for others; differences resolved with reasons | Must |
| ADJ-3 | Approval thresholds for adjustments | Should |

## E. Money, expenses and the owner
| ID | Requirement | Priority |
|---|---|---|
| MON-1 | Money places with running balances | Must |
| MON-2 | Expense entry with category, money place (or unpaid) and optional photo | Must |
| MON-3 | Owner withdrawal / owner contribution, separate from expenses | Must |
| MON-4 | Move money between places (with fee) | Must |
| MON-5 | Close day: expected versus counted cash, over/short | Must |
| MON-6 | Statement matching for bank and mobile money (CSV import) | Should |

## F. Reports and alerts
| ID | Requirement | Priority |
|---|---|---|
| REP-1 | Home dashboard answering the 10 owner questions | Must |
| REP-2 | Period report (day/week/month/year/custom): sales, COGS, gross profit, stock loss, expenses, net profit, cash movement, debts | Must |
| REP-3 | "Why cash ≠ profit" bridge | Must |
| REP-4 | Stock valuation at cost, by category | Must |
| REP-5 | Low stock alerts (per-variant threshold) | Must |
| REP-6 | Reorder suggestions from sales velocity | Should |
| REP-7 | Unit history (IMEI lookup: received from, cost, sold to, returns) | Must |
| REP-8 | Exports (CSV) for the accountant | Must |

## G. Users and trust
| ID | Requirement | Priority |
|---|---|---|
| USR-1 | Roles: Owner, Manager, Cashier; PIN for overrides | Must |
| USR-2 | Immutable event log; corrections by reversal; who/when/device on every event | Must |
| USR-3 | Hide cost and profit from cashiers | Must |
| USR-4 | Period lock ("month closed") to protect exported/synced figures | Should |
| USR-5 | Multi-location with transfers (in-transit, receive-confirm) | **Must, subject to Decision 5** (Kenya update) |

## H. Accounting and QuickBooks
| ID | Requirement | Priority |
|---|---|---|
| ACC-1 | Internal double-entry journal generated from every event (invisible by default) | Must |
| ACC-2 | Configurable account mapping (sensible defaults) | Must |
| ACC-3 | Accountant export: daily/monthly summary journal (CSV) | Must |
| ACC-4 | QuickBooks Online sync of daily summary journals and payments, idempotent | **Later** (Kenya update: very few target shops use QBO) |
| ACC-5 | Per-customer / per-supplier A/R and A/P sync to QBO | Later (Decision 3) |
| ACC-6 | VAT per line (16% standard, other rates, exempt, zero-rated), VAT-inclusive pricing | **Must** (Kenya update: shops are VAT-registered) |

## I. Kenya update (see [12](12-kenya-context.md), [13](13-new-workflows.md))
| ID | Requirement | Priority |
|---|---|---|
| KE-1 | Supplier credit terms: cash / N days / **pay when sold** / part paid; "due now" = sold-but-unpaid + overdue | Must |
| KE-2 | Owner credit screens: we owe (due now / this week / later), customers owe us (overdue / not due), statements shareable on WhatsApp | Must |
| KE-3 | Neighbour sourcing: "Sell from neighbour" (purchase and sale in one step, IMEI captured), "Borrowed from neighbour" (held, not ours), "Lent to neighbour" | Must (B1, B2) / Should (B3, B4) |
| KE-4 | Pack units (piece / box / carton) with conversion; stock held in base units | Must |
| KE-5 | Trader customers with credit limits, default terms and approval above the limit | Must |
| KE-6 | Invoice-photo stock-in: extraction → supplier and item matching with learned aliases → confirm screen; never saved without confirmation; photo kept | Should (Must if the accuracy gate passes; Decision 3) |
| KE-7 | eTIMS-ready data model: KRA item classification and unit codes, per-branch gap-free invoice sequence, customer KRA PIN, corrections only by credit note | Must |
| KE-8 | eTIMS integration (OSCU or VSCU): sales invoices, credit notes, stock in/out, purchase fetch and confirmation, imported items | Release 2 at the latest (Decision 1) |
| KE-9 | Mark purchases and expenses as eTIMS-backed or not (tax-deductibility warning) | Should |
| KE-10 | English and Somali for UI, receipts and message templates | Must |
| KE-11 | Two M-Pesa money places: Till (wallet) and Paybill (settles to bank) | Must |
| KE-12 | Roles: Owner, Manager (per location), Cashier, Storekeeper (no prices/profit), Accountant (read-only) | Must |
| KE-13 | Trade-in as "Buy from customer" (IMEI, seller ID), usable as payment | Should |
| KE-14 | Repairs module | Later |
| KE-15 | Responsive UI from phone to desktop; phone first | Must |

## Non-functional (shortlist)
- A sale completes in ≤ 3 taps after scanning, in the common case.
- Works on a low-end Android phone; tolerates intermittent internet [U, to confirm].
- No data loss: every event is persisted locally before it is acknowledged.
- Money is stored as integer minor units; one currency per shop in the MVP.
