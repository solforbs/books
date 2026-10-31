# 06 — Inventory & Accounting Data Flows

These are design proposals [I]. The diagrams use Mermaid, which renders on GitHub and in most Markdown viewers.

## 1. Core principle: one event, many projections

The owner performs **business events**. Each event is stored once, permanently. Everything else is **derived** from events:
- stock levels;
- unit status;
- balances;
- the accounting journal;
- QuickBooks sync batches.

Derived data can be rebuilt from the events. Because it is never typed twice, it cannot drift.

```mermaid
flowchart LR
    subgraph Owner actions
      R[Receive stock]
      S[Sell]
      RT[Return]
      A[Adjust / Count]
      E[Expense / Withdrawal]
      P[Pay supplier / Get paid]
    end
    R & S & RT & A & E & P --> EV[(Event log<br/>append-only)]
    EV --> ST[Stock & unit status]
    EV --> CO[Cost engine<br/>IMEI = exact cost<br/>accessories = moving avg]
    EV --> BAL[Balances:<br/>money places, customers, suppliers]
    CO --> J[(Internal journal<br/>double entry)]
    EV --> J
    J --> REP[Reports & dashboard]
    ST --> REP
    BAL --> REP
    J --> EXP[Accountant export CSV]
    J --> SYNC[QBO sync<br/>daily summary batches]
    SYNC --> QBO[(QuickBooks Online)]
```

## 2. Stock flow (units and quantities)

```mermaid
stateDiagram-v2
    [*] --> InStock: Receive / Opening stock
    InStock --> Sold: Sale
    Sold --> Inspecting: Return (inspect)
    Sold --> InStock: Return (resell)
    Sold --> Damaged: Return (damaged)
    Inspecting --> InStock: OK
    Inspecting --> Damaged: Faulty
    Damaged --> SupplierReturn: Send back
    InStock --> SupplierReturn: Return to supplier
    InStock --> WrittenOff: Missing / Stolen / Damaged
    Damaged --> WrittenOff: Write off
    SupplierReturn --> [*]: Credit / Replacement
    WrittenOff --> [*]
```

## 3. Event → journal mapping (what happens in the background)

"Dr" (debit) means the bucket on the left side grows (an asset or cost). "Cr" (credit) means the source. The owner never sees these terms.

| Event | Debit | Credit |
|---|---|---|
| Opening stock | Inventory | Opening balance equity |
| Receive, paid now | Inventory | Money place |
| Receive, pay later | Inventory | Accounts payable (supplier) |
| Pay supplier | Accounts payable | Money place |
| Sale (each payment part) | Money place | Sales |
| Sale (unpaid part) | Accounts receivable (customer) | Sales |
| Sale cost | COGS | Inventory |
| Customer pays debt | Money place | Accounts receivable |
| Return with refund | Sales returns *(or Sales)* | Money place |
| Return cost back to stock | Inventory | COGS |
| Return to Damaged status | Stock loss | COGS |
| Write-off | Stock loss | Inventory |
| Count gain | Inventory | Stock loss |
| Expense paid | Expense category | Money place |
| Expense unpaid | Expense category | Accounts payable (other) |
| Owner withdrawal | Owner drawings | Money place |
| Owner contribution | Money place | Owner capital |
| Move money (with fee) | Destination + Bank fees | Source |
| Cash over/short | Cash over/short | Cash drawer (or reversed) |
| Tax on sale (if applicable) [U] | — | Tax payable (split from Sales) |

**Invariant [I]:** for any period, the sum of debits equals the sum of credits. Inventory account balance = Σ(cost of units in stock) + Σ(qty × avg cost for accessories). This is checked automatically every night (see the reconciliation section below).

## 4. Cash versus profit bridge

```mermaid
flowchart TB
    NP[Net profit for period] --> B1["+ Cost of stock sold and stock losses (not cash outflows this period)"]
    B1 --> B2["− All stock received at cost, paid or unpaid (not an expense)"]
    B2 --> B3["− Increase in customer debts (sales not yet paid)"]
    B3 --> B4["+ Increase in supplier debts (stock not yet paid)"]
    B4 --> B5["− Owner withdrawals"]
    B5 --> B6["+ Owner contributions"]
    B6 --> CC[Change in money places]
```
(Rendered in the app as a short, plain-language list. The order shown is illustrative.)

## 5. QuickBooks sync flow (recommended design; see [07](07-quickbooks-feasibility.md))

```mermaid
sequenceDiagram
    participant App as Our app (source of truth: stock, costs, sales, debts)
    participant Q as Sync queue
    participant QBO as QuickBooks Online
    App->>Q: At day close: build batch for date D (deterministic from journal)
    Q->>QBO: Create JournalEntry (DocNumber = SHOP-D, requestid = hash(shop, D, version))
    QBO-->>Q: Id, SyncToken
    Q->>App: Store mapping (D → QBO Id, amount totals)
    Note over App,QBO: Late correction to day D (e.g., backdated return)
    App->>Q: Rebuild D → new version
    Q->>QBO: Update JournalEntry D (Id, SyncToken) — never create a second one
    Q->>QBO: Nightly read-back: totals by account for D (metered read)
    QBO-->>Q: Totals
    Q->>App: Mismatch? → flag "QBO differs" for review
```

## 6. Reconciliation loops (automatic, nightly) [I]

| Check | Compares | On mismatch |
|---|---|---|
| Journal balance | Σ debits vs Σ credits | Block reports, raise an engineering alert |
| Stock value | Inventory account vs unit/qty × cost projection | Flag |
| Money places | Expected drawer vs counted at close | Cash over/short entry |
| Customers / suppliers | Ledger total vs A/R / A/P account | Flag |
| QBO | Our day totals per account vs QBO journal for that day | "Needs review" item; do **not** auto-fix QBO-side edits |
| Physical stock | Count events | Write-off / gain with reason |
