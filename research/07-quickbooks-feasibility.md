# 07 — QuickBooks Integration Feasibility Report

> **Kenya update (2026-10-31):** the founders report that very few target traders use QuickBooks; most keep paper books [F]. **QuickBooks sync is now "Later"** (ACC-4). An accountant CSV export stays a Must. **eTIMS is now the key external integration**; see [12-kenya-context.md](12-kenya-context.md). This report stays valid for the bigger shops that do use QBO (the global edition in Kenya).


Labels: [V] verified primary · [V-s] official page seen only as a search extract (Intuit developer pages render with JavaScript and could not be fetched in full) · [S] secondary · [I] inference · [U] unknown.

> **Bottom line:** integration with **QuickBooks Online** looks technically feasible for the recommended approach (summary journals plus payments), but it is **not yet verified for the likely launch region**.
>
> Before committing:
> - confirm the launch country and its QBO edition;
> - test every needed endpoint in an Intuit sandbox (and, for the global edition, a real trial company);
> - confirm App Partner Program terms for our country.
>
> QuickBooks **Desktop** is out of scope unless interviews show shops use it.

## 1. Which QuickBooks product and edition?

| Candidate | Relevance | Evidence |
|---|---|---|
| **QBO Plus / Advanced (US)** | Full inventory (FIFO), InventoryAdjustment API | Inventory needs Plus/Advanced [V]. InventoryAdjustment is "available for QuickBooks Online Plus and advanced SKUs in the US" [V-s] |
| **QBO global edition** (Kenya, Uganda, South Africa, UAE, Philippines, …) | Probable fit if "mobile money" means East Africa | The global page lists these countries and Simple Start/Essentials/Plus/Advanced plans; inventory only on Plus/Advanced [V]. A Kenyan reseller lists QBO Plus in KES [S] |
| QBO regional (UK, CA, AU, ZA localised) | If the launch is in those markets | Regional help articles exist (e.g. UK, ZA, SG inventory guides) [V-s] |
| QuickBooks Desktop / Enterprise | Has serial/lot tracking (Enterprise Advanced Inventory) [S]; different API (QBXML/Web Connector) | Out of scope unless interviews say otherwise |

**Action:** decide the country (Decision 1), then confirm the exact edition used by 5–10 target shops and their accountants.

## 2. What the QBO Accounting API offers (relevant subset)

| Need | QBO entity | Status |
|---|---|---|
| Items with quantity | `Item` (Type=Inventory; `TrackQtyOnHand`, `QtyOnHand`, `InvStartDate`, `AssetAccountRef`) | [V-s] |
| Sales paid now | `SalesReceipt` | [V-s] standard entity |
| Credit sales / customer payments | `Invoice`, `Payment` | [V-s] |
| Refunds / customer credit | `RefundReceipt`, `CreditMemo` | [I] standard entities; verify in sandbox |
| Supplier bills / payments | `Bill`, `BillPayment`, `VendorCredit` | [V-s] Bill/BillPayment; VendorCredit [I] |
| Expenses | `Purchase` | [I] verify |
| Stock write-offs | `InventoryAdjustment` (added Sept 2024) | [V-s] **US Plus/Advanced only** |
| Summary posting | `JournalEntry` | [I] standard entity; verify locale behaviour |
| Money moves | `Transfer`, `Deposit` | [I] verify |
| Idempotent create | `?requestid=<unique>` query parameter, ≤ 50 characters, unique per company; a replay returns the original response | [V-s] |
| Detecting accountant edits | Change Data Capture (CDC), webhooks (moving to the CloudEvents format) | [V-s] |
| Limits | 500 requests/min per company; 10 concurrent requests; batch 40/min with ≤ 30 items | [V-s] (official page; full text not fetched) |
| Auth | OAuth 2.0, the user connects their own QBO company | [I] standard; verify the production-app review process [U] |

### Known behavioural pitfalls if QBO tracks inventory itself
- QBO lets stock go negative with no switch to prevent it [S]. Intuit lists causes such as unconverted POs, because "QuickBooks only counts items as inventory after you create a bill" [V].
- A late bill re-costs earlier sales, which can move COGS between periods [S].
- An item's `InvStartDate` constrains the dates of transactions that use it [S].
- QBO costs inventory by FIFO, so it cannot represent per-IMEI specific cost [V-s]/[I].

## 3. Commercial terms (Intuit App Partner Program)

- **Launch:** 28 July 2025 for **US** partners; non-US partners "later in 2025, with 30-day notice" [S quoting Intuit]. **Current status for non-US partners: unverified** [U].
- **API types:** *Core* calls (mostly writes/creates) are unmetered. *CorePlus* calls (mostly reads/queries/reports) are metered [S, citing Intuit's API-classification article].
- **Tiers:**

  | Tier | Fee | CorePlus allowance | Over the limit |
  |---|---|---|---|
  | Builder | free | 500k/month | calls blocked |
  | Silver | about $300/month | about 1M | about $3.50 per 1k |
  | Gold | about $1,700/month | higher allowance | lower rates |
  | Platinum | about $4,500/month | 75M | about $0.25 per 1k |

  All figures are [S]; **re-verify on Intuit's official pages before budgeting**.
- **Implication [I]:** a write-heavy, read-light design (push daily journals, do minimal read-backs) fits within the free Builder tier for a long time. Each shop would use roughly 1 create, 1 read-back and a few CDC calls per day.
- **Shop's own subscription [I]:** if QBO does *not* track inventory in our design, the shop may not need Plus. Journal entries are available on lower plans [U, verify per region]. That could save the shop money, which is a selling point to validate.

Official links (fetching blocked or redirected; cited via secondary sources): Intuit App Partner Program announcement (blogs.intuit.com/2025/05/15/introducing-the-intuit-app-partner-program/ → medium.com/intuitdev); API classification (help.developer.intuit.com/s/article/API-classification-for-the-Intuit-App-Partner-Program).

## 4. Approach A versus Approach B

| | **A. Our app runs the shop; sync to QBO** | **B. Our app gradually becomes the accounting system** |
|---|---|---|
| Owner experience | Same app either way | Same |
| Accountant experience | Keeps QBO, which they know | Must learn our app or receive exports; many will resist [I] |
| Compliance (tax, statutory reports) | QBO plus the accountant handle it | We must build tax and statutory reporting per country, which is large and ongoing work |
| Build effort | Integration plus reconciliation (medium) | General ledger, closing, tax and audit features (large) |
| Risk | API/terms changes; QBO-side edits | Accountant rejection; regulatory scope |
| Lock-in / value | We depend on Intuit for the accountant link | Higher long-term value, slower start |
| Recommendation | **Start here**, with an accountant CSV export as the fallback | Keep it possible: our internal journal (ACC-1) makes B feasible later |

**Recommended hybrid [I]:** the app keeps a complete internal double-entry journal from day 1 (needed for our own reports anyway). QBO is a **downstream copy for the accountant**. If a shop has no accountant or no QBO, our reports and exports suffice. That is Approach B for those shops without promising it.

## 5. Source of truth per data type (recommended)

| Data | Source of truth | In QBO as | Direction |
|---|---|---|---|
| Products, variants, prices | **App** | Not synced (or a few category-level Items for sales-receipt mode) | App → QBO |
| Stock quantities, IMEIs, unit costs | **App** | Not tracked (QBO inventory tracking **off** for these goods) | — |
| Inventory value (balance) | **App** | Inventory Asset account, moved by journal | App → QBO |
| Sales, returns, COGS, stock loss | **App** | Daily summary JournalEntry by category | App → QBO |
| Money received by method | **App** | Lines to the mapped bank/clearing accounts in the daily JE | App → QBO |
| Customer debts (A/R) | **App** | MVP: a "Shop customer credit" clearing asset account. Later: per-customer A/R | App → QBO |
| Supplier debts (A/P) | **App** | MVP: a "Shop supplier payable" clearing liability. Later: per-vendor Bills | App → QBO |
| Shop expenses | **App** (recorded at the till) | Lines in the daily JE | App → QBO |
| Bank fees, loans, payroll, depreciation, tax filings | **QBO / accountant** | Native | QBO only |
| Chart of accounts | **QBO** | — | App reads the account list to map (read call) |

**Why clearing accounts in the MVP [I]:** QBO normally requires a customer or vendor name on journal lines that hit A/R or A/P [I, verify in sandbox]. Clearing accounts avoid syncing every customer and supplier. The cost is that the accountant sees one total, not who owes what; our app's export provides the detail. This is Decision 3.

## 6. Preventing duplicates and double counting

1. **One posting channel per fact.** If our app posts sales, the shop must **disconnect** any other sales feed into QBO (e.g. the Square connector, or bank-feed rules auto-creating sales receipts). Onboarding includes a checklist [I].
2. **Deterministic, idempotent batches.** One JE per shop-day, `DocNumber` = `SHOP-YYYYMMDD`, `requestid` derived from (shop, date, version) [V-s for requestid semantics]. Retries cannot create a second entry.
3. **Update, never re-create.** Late corrections update the same day's JE (using its Id and SyncToken), or post a dated correction JE, depending on whether the accountant has closed that QBO period [U, check closing-date behaviour].
4. **Bank-feed collision.** When the bank or mobile-money statement is imported into QBO, the accountant must *match* deposits to our clearing/bank lines, not "add" them as new income. We map card and mobile-money receipts to **clearing accounts** that the deposit then clears. That is the standard pattern [I].
5. **Never let QBO track quantity for the same goods.** Otherwise there are two stock engines with different costing (FIFO vs per-IMEI), which leads to guaranteed drift [I].
6. **Period lock.** Once a day is synced and the month is locked in our app (USR-4), edits require an explicit correction event.

## 7. Reconciliation procedure (monthly, assisted)

| Item | Our app | QBO | Expected relationship |
|---|---|---|---|
| Stock | Stock value at cost (by category) | Inventory Asset balance | Equal at month end |
| Sales / COGS / stock loss | Period report | P&L lines from our JEs | Equal |
| Cash and mobile money | Money-place balances after close-day | Bank/clearing accounts after the accountant matches the statement | Equal; differences point to unmatched or duplicated entries |
| Customer debts | Debtors list total | Customer-credit clearing account (or A/R) | Equal |
| Supplier debts | Creditors list total | Supplier-payable clearing account (or A/P) | Equal |

The app produces a one-page **"Month pack"** for the accountant with these five lines, the per-customer and per-supplier detail, and the stock list.

## 8. Feasibility verdict and open checks

| Check | Status |
|---|---|
| QBO API supports the JournalEntry-based design | Likely [I]; **verify in sandbox** |
| Works for the QBO global edition (e.g. Kenya) | **Unknown.** A community answer says the API works across locales [S]; sandbox availability for global-edition companies is unknown [U]. Test with a real trial company |
| InventoryAdjustment outside the US | Documented as US-only [V-s], which our design avoids needing |
| App Partner Program terms for non-US developers | **Unknown** [U] |
| Production app review / security requirements | **Unknown** [U] |
| Shops' accountants accept summary journals | **Unknown**; interview 5+ accountants [U] |

## Sources
- https://quickbooks.intuit.com/subscription/ · https://quickbooks.intuit.com/global/online-compare/
- https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-management/set-track-inventory-quickbooks-online/L22FZLBGN_US_en_US
- https://quickbooks.intuit.com/learn-support/en-us/help-article/inventory-management/fix-negative-inventory-issues-quickbooks-online/L95hlEOoc_US_en_US
- https://developer.intuit.com/app/developer/qbo/docs/develop/basic-implementations/basic-inventory-implementation
- https://developer.intuit.com/app/developer/qbo/docs/workflows/manage-inventory/inventory-adjustment
- https://developer.intuit.com/app/developer/qbo/docs/learn/limits-and-throttles
- https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api
- https://help.developer.intuit.com/s/article/QuickBooks-Online-API-Best-Practices (requestid)
- https://blogs.intuit.com/2015/04/06/15346/ (Request ID)
- https://www.apideck.com/blog/quickbooks-api-pricing-and-the-intuit-app-partner-program (secondary, App Partner Program tiers)
- https://help.developer.intuit.com/s/question/0D50f00005gIFP4CAO/is-is-possible-to-connect-to-the-qb-api-of-the-global-version (community)
- https://plannettech.co.ke/product/quickbooks-online/ (reseller, Kenya pricing; secondary)
- https://retail-support.lightspeedhq.com/hc/en-us/articles/360007852213-Integrating-accounting-software-with-Lightspeed-Accounting (precedent for summary journals)
