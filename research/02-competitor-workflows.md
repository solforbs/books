# 02 — Competitor Workflow Comparison

Labels: [V] verified primary · [V-s] official page seen only as a search extract · [S] secondary · [I] inference · [U] unknown. See [00-README](00-README.md).

## 1. Products studied and why

| Product | Why it's relevant | Depth of evidence |
|---|---|---|
| **QuickBooks Online (QBO) Plus/Advanced** | What the shops use today | Help centre [V], developer docs [V-s] |
| **Square for Retail** | Mainstream POS with detailed stock-adjustment reasons and purchase orders | Help centre [V]/[V-s] |
| **Lightspeed Retail (R-Series)** | Serialised items, plus a mature QBO accounting connector | Help centre [V] |
| **Loyverse** | Very simple, free-core POS that is popular with small shops in emerging markets [I] | Help centre [V] |
| **Zoho Inventory** | Inventory app with serial tracking and a QBO integration | Help centre [V]/[S] |
| **RepairDesk** | Built for phone shops: IMEI per unit, trade-ins | Help centre/blog [V] |
| **Sortly** (simplicity case study) | "Inventory simplified": photo + name + quantity + alerts | Marketing/help [V-s] |

**Limits of this research.** We did not use trial accounts or demos. Workflow descriptions come from documentation, not hands-on observation. Wherever a step was not documented, the cell says [U]. We make no claims about any product's internal implementation.

## 2. Summary matrix

✔ = documented; ✖ = documented as absent or not supported; ~ = workaround or partial; ? = not verified.

| Workflow | QBO Plus/Adv | Square Retail | Lightspeed R | Loyverse | Zoho Inv. | RepairDesk |
|---|---|---|---|---|---|---|
| Quick add product | ✔ [V] | ✔ [I] | ✔ [V] | ✔ [V] | ✔ [V] | ✔ [V] |
| Bulk import (spreadsheet) | ✔ [S] | ? | ? | ✔ free [V] | ? | ? |
| Receive stock with cost | ✔ via Bill/Expense/Check [V] | ✔ via PO, cost saved [V] | ✔ via PO [V] | ✔ PO (paid add-on) [V] | ✔ [V] | ✔ PO [V] |
| Supplier debts (A/P) | ✔ Bills [V] | ? | ~ PO → bill in QBO [V] | ✖ [I] | ✔ bills [V] | ? |
| Serial / IMEI per unit | ✖ in QBO Online [S] | ? | ✔ [V] | ✖ [U] | ✔ on some plans [V] | ✔ [V] |
| Sell → stock auto-decrements | ✔ Invoice/Sales Receipt [V] | ✔ | ✔ | ✔ | ✔ | ✔ |
| Multiple payment methods | ✔ | ✔ | ✔ [V] | ✔ custom types [V] | ✔ | ? |
| Split / partial payment | ✔ invoice payments | ? | ? | ✔ split [V] | ✔ | ? |
| Customer credit (owes us) | ✔ A/R [I] | ? | ✔ "on account" [V] | ~ workaround [S] | ✔ | ? |
| Returns / refunds | ✔ Credit memo / refund receipt [I] | ✔ | ✔ [V] | ? | ✔ incl. serial [V] | ? |
| Damaged / lost / theft reasons | ~ one shrinkage account [V] | ✔ rich reasons [V] | ? | ✔ reasons [V] | ✔ | ? |
| Stock count vs. system | ~ adjust quantity [V] | ✔ re-count [V] | ? | ✔ full/partial count [V] | ✔ | ✔ [V] |
| Multi-location transfer | Advanced/Enterprise only [U] | ✔ "transferred" [V] | ? | ✔ add-on [V] | ✔ transfer orders [V] | ? |
| Low-stock / reorder | ✔ reorder point [V] | ✔ [I] | ✔ | ✔ alerts free [V] | ✔ | ? |
| COGS & gross profit | ✔ FIFO [V] | ✔ COGS report [V-s] | ✔ | ? | ✔ | ? |
| Accounting sync to QBO | n/a | ✔ connector [S] | ✔ 3 modes [V] | ? | ✔ [S] | ? |

---

## 3. Workflow-by-workflow analysis

Each workflow covers seven points: (1) what the owner does, (2) what they enter, (3) what the software automates, (4) which records change, (5) errors and confusion, (6) what makes it simple or hard, and (7) evidence.

### W1. Adding a new product quickly
- **QBO:** Products & Services → New → choose *Inventory* type → name, SKU, initial quantity, **as-of date**, reorder point, inventory asset account, sales price and income account, cost and expense account [V for the workflow, V-s for API fields `QtyOnHand`, `InvStartDate`, `AssetAccountRef`]. Inventory tracking must first be switched on in Settings → Sales [V].
  - **Records:** an Item record plus an opening-balance inventory transaction dated at the as-of date [V-s].
  - **Confusion [I]:** three account pickers on a product form. The as-of date also controls which transactions can use the item (a later-dated start makes earlier sales fail) [S].
- **Loyverse / Sortly:** name, price, optional cost, SKU/barcode, track-stock toggle. Sortly's pitch is "enter item details like name and quantity, click Add" [V-s].
- **Lesson [I]:** the product form must **never** show accounts. Those are set once, per category, by default.

### W2. Bulk import from spreadsheets
- **Loyverse:** item import is in the free tier [V].
- **QBO:** import exists [S]. Details of opening quantity and cost on import were not verified [U].
- **Lesson [I]:** the import must accept the shop's *messy* existing sheet. That means column mapping, a preview, duplicate detection by barcode or name, and opening quantities with cost. It must create **one opening-stock event**, not hundreds of fake purchases.

### W3. Recording incoming stock and purchase costs
- **QBO:** stock rises only when a **Bill** (paying later), **Check** or **Expense** (paid now) is saved. A Purchase Order alone does not add stock: "QuickBooks only counts items as inventory after you create a bill" [V].
  - **Records:** the inventory asset goes up and A/P (or the bank) goes up.
  - **Errors:** forgetting to convert a PO to a bill causes negative stock and wrong COGS [V].
- **Square:** receive against a PO. The unit cost is saved automatically. Items can be marked "Damaged" or "Won't fulfill" during receiving, and fees such as shipping can be added [V].
- **Lightspeed:** receive a PO and add serial numbers during receiving [V].
- **Lesson [I]:** one **"Receive stock"** screen covering the supplier, items and costs, an optional supplier invoice number, and *paid now / pay later / part paid*. That single action must both add stock and create the debt. Never make the owner record the goods and the bill in two separate places.

### W4. Supplier invoices and outstanding supplier debts
- **QBO:** Bill → Pay Bills (BillPayment) → A/P ageing [I, standard QBO]. The API supports Bill and BillPayment entities [V-s].
- **Lightspeed → QBO:** purchase orders can sync as bills, or as draft POs that need manual validation [V].
- **Loyverse:** no evidence of supplier balances [U]. POs are a paid add-on [V].
- **Lesson [I]:** a "Suppliers I owe" list with one-tap *Pay* (full or partial, choosing cash, bank or mobile money).

### W5. Serial numbers / IMEIs
- **QBO Online:** no native serial or lot tracking on any plan, according to multiple independent sources [S]. QuickBooks *Desktop Enterprise* (Advanced Inventory) does have it [S].
- **Lightspeed R-Series:** tick "Serialized" on the item. At sale, staff use a dropdown to "scan, type, or select an existing serial number" or "Add New Serial". An Inventory → Serial Numbers page links each serial to its original sale [V]. One support article says serialised items require a customer on the sale [V-s], but the main article implies this is optional [V]. **The two sources conflict [U].**
- **Zoho Inventory:** serials are captured on purchase receipts/bills and hand-picked on invoices. They are not assigned at the Sales Order stage [S]. Available "only for selective pricing plans" [V].
- **RepairDesk:** "serialized" versus "non-serialized" items. Each unit keeps its vendor, PO, cost, buyer, invoice, price and sale date [V]. There is also an IMEI/theft check at trade-in [V].
- **Errors [I]:** selling the wrong IMEI; typos in 15-digit IMEIs (the IMEI has a Luhn check digit, so a check-digit validator catches most typos); the same IMEI received twice; a returned device going back to "available" without an inspection.
- **Lesson [I]:** IMEI must be **scan-first**, validated, unique per shop, and must carry its own cost. This is the single most important electronics-specific feature.

### W6. Selling and automatic stock update
- **QBO:** an Invoice (payment later) or a Sales Receipt (paid now) reduces quantity on hand [V]. FIFO cost goes to COGS [V-s].
  - **Errors:** QBO allows overselling into negative quantities with no setting to block it. When the bill is entered later, QBO re-costs the earlier sale, which can shift COGS between periods [S, consistent with Intuit's description of the causes [V]].
- **POS products:** scan → cart → pay. Stock decrements immediately [I, universal].
- **Lesson [I]:** block sales of serialised stock that we don't have. For accessories, allow a sale with a **warning** that logs "sold without stock" for review, so a shop is never stuck at the counter.

### W7. Cash, card, bank and mobile-money payments
- **Loyverse:** Cash and Card by default, plus custom payment types that appear in reports [V].
- **Lightspeed → QBO:** each payment type maps to an account [V].
- **Mobile money:** no product studied documented a native mobile-money integration [U]. In practice it is a custom payment type [I].
- **Lesson [I]:** each payment method is a "money place" (cash drawer, bank, M-Pesa till, card settlement) with its own balance and reconciliation.

### W8. Partial payments and customer credit
- **Loyverse:** splitting a payment across methods is supported [V]. Customer debt is handled by workarounds such as an "Account receivable" custom payment type [S community].
- **Lightspeed:** "on account" sales sync to QBO, and their COGS is included in the register closure COGS journal [V-s].
- **QBO:** invoice then receive payment (partial allowed) [I, standard].
- **Lesson [I]:** at checkout, "Paid now: X; rest owed by [customer]" is one screen. The customer's balance and a payment history are on the customer page.

### W9. Returns, exchanges, refunds, damaged and missing stock
- **Square:** adjustment reasons include damaged, lost, theft, internal use, vendor return, re-count and received. Custom reasons are possible [V]. Damage, theft and loss adjustments do not appear in the COGS report [V-s].
- **QBO:** "Adjust quantity" posts to an adjustment account (default *Inventory Shrinkage*), and Intuit warns "this will affect your financial statements" [V].
- **Zoho:** returns of serial and batch items are tracked [V-s].
- **Lesson [I]:** a returned device chooses where it goes: *back to sellable*, *to damaged/inspection*, or *to supplier return*. Shrinkage is reported as its own line, never hidden in COGS.

### W10. Stock transfers (multi-location)
- Square (a "transferred" reason [V]), Loyverse (paid add-on [V]) and Zoho (transfer orders [V-s]) support it. QBO Online's multi-location inventory was not verified [U].
- **Lesson [I]:** defer this. Most target shops are probably single-location [U, to verify in interviews].

### W11. Low stock and reorder suggestions
- QBO has a reorder point that triggers an alert, with no automatic PO [V]/[S]. Loyverse low-stock alerts are free [V]. Sortly has quantity thresholds [V-s].
- **Lesson [I]:** a reorder suggestion of *recent sales velocity × lead time − on hand*, shown as a list the owner can turn into a supplier order via WhatsApp or print. That covers the need without any forecasting "AI".

### W12. COGS and gross profit
- QBO uses FIFO [V-s]. Square has a COGS report [V-s]. Lightspeed can "Book Inventory/COGS" to the accounting system [V].
- **Lesson [I]:** use specific identification for serialised devices (exact cost) and moving average for accessories (simplest and stable). Explain profit as "sold for − cost of what you sold".

### W13. Expenses, and cash versus profit
- QBO's Expense entity and reports exist [I]. None of the POS products studied is designed for this [I].
- **Lesson [I]:** an "Expense" button with a category, an amount, the money place it came from and an optional receipt photo. "Owner took money" is a **separate** button, because drawings are not expenses. The home screen shows *Cash* and *Profit* side by side, with a "why are they different?" breakdown. See [03](03-business-transaction-model.md).

### W14. Daily, weekly, monthly and yearly reports
- All products report. Lightspeed's QBO connector posts register closures and daily summaries [V].
- **Lesson [I]:** one report template that works for any period: sales, gross profit, expenses, net profit, money in/out by method, debts in/out and stock value. Include a "close the day" ritual that counts the drawer.

### W15. Stock-count discrepancies
- **Loyverse:** full or partial count; enter or scan counts; autosave every 30 seconds; Complete updates stock; status moves Pending → In progress → Completed [V].
- **QBO:** manual quantity adjustment only [V].
- **Lesson [I]:** use *rolling partial counts* (e.g. "count phones daily, accessories weekly"). For serialised items, the count is a **scan of IMEIs**, and the app lists exactly which IMEIs are missing. That is far better than a number difference.

---

## 4. Integration-pattern evidence (relevant to Phase 5)

| Product | How it sends data to QBO | Evidence |
|---|---|---|
| Lightspeed Accounting | Journal Entry (daily summary by category), Summary Sales Receipt, or Itemized Sales Receipt. Optional Inventory/COGS booking. Payment types mapped to accounts. POs as bills or drafts. | [V] |
| Intuit Square connector | Sales, refunds, fees, taxes, payouts. Recently changed from summary receipts to individual transactions; inventory counts are not kept consistent. One QBO company per Square account, one location. | [S] |
| Zoho Inventory | Exports bills, credit notes and invoices to QBO | [S] |

**Inference [I]:** mature POS vendors avoid making QBO the inventory engine. The cleanest pattern (Lightspeed's Journal Entry mode) keeps item-level detail in the POS and sends **summarised accounting effects** to QBO.

## 5. What makes a workflow simple: patterns observed [I]

1. **One action, many records.** The owner does a business action ("received 20 phones, pay next week"), not an accounting one ("create bill").
2. **Scan first.** Barcodes for products, IMEIs for units.
3. **Defaults, not forms.** Accounts are set per category once. Sortly and Loyverse feel simple mainly because they hide accounting completely.
4. **Reasons, not accounts.** Square's adjustment reasons (damaged, theft, re-count) are owner language. QBO's "choose an adjustment account" is accountant language.
5. **Failure modes are visible.** Negative stock, sales without a cost and unmatched payments appear as a to-do list, not as silent errors that surface in the accountant's monthly review.

## Sources

- QBO subscription levels: https://quickbooks.intuit.com/subscription/
- QBO set up & track inventory (US): https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-management/set-track-inventory-quickbooks-online/L22FZLBGN_US_en_US
- QBO negative inventory: https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-management/fix-negative-inventory-issues-quickbooks-online/L95hlEOoc_US_en_US
- QBO global plan comparison: https://quickbooks.intuit.com/global/online-compare/
- Intuit inventory API overview: https://developer.intuit.com/app/developer/qbo/docs/develop/basic-implementations/basic-inventory-implementation
- Intuit InventoryAdjustment workflow: https://developer.intuit.com/app/developer/qbo/docs/workflows/manage-inventory/inventory-adjustment
- QBO serial-tracking gap (secondary): https://www.inflowinventory.com/blog/quickbooks-inventory-management/ , https://katanamrp.com/quickbooks-online-serial-number-tracking/
- QBO negative-inventory re-costing (secondary): https://lendahandaccounting.com/2025/11/15/a-proadvisors-guide-on-correcting-negative-on-hand-inventory-in-quickbooks-online/
- Square stock-adjustment history: https://squareup.com/help/us/en/article/6061-view-stock-adjustment-history-with-square-for-retail
- Square purchase orders: https://squareup.com/help/us/en/article/8258-create-purchase-orders-with-square-for-retail
- Square receive/adjust: https://squareup.com/help/us/en/article/6110-manage-inventory-with-the-retail-pos-app
- Lightspeed selling serialised products: https://retail-support.lightspeedhq.com/hc/en-us/articles/37022957532443-Selling-products-with-serial-numbers
- Lightspeed receiving POs with serials: https://retail-support.lightspeedhq.com/hc/en-us/articles/8153229791131-Adding-serial-numbers-when-receiving-purchase-orders
- Lightspeed Accounting setup: https://retail-support.lightspeedhq.com/hc/en-us/articles/360007852213-Integrating-accounting-software-with-Lightspeed-Accounting
- Lightspeed X-Series on-account to QBO: https://x-series-support.lightspeedhq.com/hc/en-us/articles/25533802138011-Sending-on-account-sales-to-QuickBooks-Online
- Loyverse advanced inventory: https://loyverse.com/advanced-inventory
- Loyverse inventory count: https://support.loyverse.com/en/articles/1665325-how-to-work-with-inventory-count
- Loyverse payment types: https://help.loyverse.com/help/configuring-payment-types-loyverse ; split payment: https://help.loyverse.com/help/payment-loyvers
- Loyverse credit-sales workaround (community): https://loyverse.town/topic/4801-credit-sales/
- Zoho serial tracking: https://www.zoho.com/us/inventory/help/advanced-inventory-tracking/serial-number-tracking.html ; serial returns: https://www.zoho.com/us/inventory/kb/sales-returns/advanced-return-tracking.html
- RepairDesk serialised items: https://help.repairdesk.co/portal/en/kb/articles/serialized-inventory-item ; trade-ins: https://blog.repairdesk.co/2026/09/29/how-to-manage-trade-ins-and-buybacks-alongside-repairs-in-one-system/
- Sortly: https://www.sortly.com/business-inventory-app/
- Intuit Square connector discussion (community): https://quickbooks.intuit.com/learn-support/en-us/other-questions/the-new-square-connector-app-eliminated-my-summary-sales/00/1572343
