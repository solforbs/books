# 03 — Electronics-Shop Business & Transaction Model

This model is **our design reasoning [I]**, grounded in the workflows from [02](02-competitor-workflows.md). Statements about how real shops behave are hypotheses to test in interviews [U]. We have no customer data yet.

## 1. A 60-second accounting primer for the founders

Every shop event changes some of these **six buckets**. The app keeps them in balance automatically using double entry: each event is recorded twice, once where value comes from and once where it goes.

| Bucket | Plain meaning | Accounting name |
|---|---|---|
| **Money places** | Cash drawer, bank account, mobile-money till, card settlement | Cash / bank (asset) |
| **Stock at cost** | What the stock on the shelves cost us | Inventory (asset) |
| **People who owe us** | Customers on credit | Accounts receivable (asset) |
| **People we owe** | Suppliers we pay later | Accounts payable (liability) |
| **Profit pieces** | Sales, cost of what we sold, expenses, stock losses | Income / COGS / expenses |
| **Owner's stake** | Money the owner put in or took out | Equity / drawings |

**Why cash ≠ profit.** Profit = sales − cost of goods sold − expenses − stock losses. Cash changes for other reasons too:
- buying stock uses cash but is not an expense until the stock is sold;
- a credit sale is profit without cash;
- paying a supplier debt is cash without any profit effect;
- owner withdrawals reduce cash but are not expenses.

The app must show this reconciliation in plain words.

## 2. The product model: three levels

```
Product (e.g., "iPhone 13")
 └─ Variant (e.g., 128GB / Blue / Used-A)     ← what has a price and a barcode
     └─ Unit (e.g., IMEI 35xxxxxxxxxxxxx)     ← only for serialised variants
```

- **Variant attributes** an electronics shop needs: storage, colour, condition (New / Open-box / Used grade A/B/C / Refurbished), and sometimes region/network-lock or RAM. Attributes are a **free list per product type**, not hard-coded [I].
- **Serialised variant (phones, laptops, tablets, smartwatches, consoles):**
  - stock is a set of Units, and each Unit has its own IMEI/serial, cost, supplier, received date, status and warranty end date;
  - dual-SIM phones have two IMEIs, so store IMEI1, IMEI2 and the serial [I].
- **Quantity variant (chargers, cases, cables, screen protectors):** stock is a number. Cost is a moving average [I, recommended for simplicity].
- **Bundle (e.g., "Phone + case + protector deal"):** a sale item that consumes its components' stock. Only the price is special [I]. **Should Have**, not Must.

### Unit status lifecycle (serialised)
```
Received → In stock → Sold → (Returned → Inspecting → In stock | Damaged | Back to supplier)
                    → Damaged / Missing / Stolen (written off)
                    → Reserved (layaway/deposit) [Later]
```

## 3. Costs and prices

- **Different purchase costs.** Normal for phones because of FX, supplier and grade. Specific identification (each IMEI's own cost) gives exact profit per device [I].
- **Landed cost** (shipping/clearing on a supplier delivery): **Should Have**. Spread it across the received lines by value [I]. Square lets the receiver add fees when receiving [V].
- **Retail versus wholesale price:** two price fields per variant; the cashier picks "Wholesale" per sale or per customer. **Should Have** [I]. Many phone shops also sell to smaller dealers [U].
- **Discounts:** a line or cart amount or percentage. Profit uses the net price. Permission-controlled above a threshold [I].
- **Price negotiation is common** in some markets [U]. The default price is editable at sale, but the minimum price (for example, cost) needs a manager PIN [I].

## 4. Parties

- **Suppliers:** name, phone, balance owed, history. Some allow paying later; some take part payments [I].
- **Customers:** optional for cash sales, **required** for credit sales and recommended for IMEI sales (for the warranty) [I].
- **Staff:** roles control discounts, refunds, adjustments, cost visibility, expenses and owner reports.

## 5. Transaction catalogue: every event and its effects

`+`/`−` show the direction of change. "Stock" is quantity; "Stock $" is stock at cost.

| # | Event (owner language) | Stock | Stock $ | Money place | Owed to us | We owe | Profit pieces |
|---|---|---|---|---|---|---|---|
| T1 | Opening stock (import) | + | + | | | | (equity: opening balance) |
| T2 | Receive stock, paid now | + | + cost | − | | | |
| T3 | Receive stock, pay later | + | + cost | | | + | |
| T4 | Pay supplier (full/part) | | | − | | − | |
| T5 | Sale, paid in full | − | − cost | + | | | Sales +; COGS + |
| T6 | Sale, part paid / credit | − | − cost | + paid part | + rest | | Sales +; COGS + |
| T7 | Customer pays debt | | | + | − | | |
| T8 | Return, refund in cash | + (if resellable) | + cost | − | | | Sales −; COGS − |
| T9 | Return, credit to customer account | + | + cost | | − | | Sales −; COGS − |
| T10 | Exchange | T8/T9 + T5/T6 combined, settle the difference | | | | | |
| T11 | Return to supplier | − | − cost | (+ refund) | | (− credit) | |
| T12 | Damaged / stolen / missing write-off | − | − cost | | | | **Stock loss** + (separate from COGS) |
| T13 | Count difference (found more) | + | + cost | | | | Stock loss − (gain) |
| T14 | Expense (rent, power, transport) | | | − | | (or + if unpaid) | Expense + |
| T15 | Owner withdrawal | | | − | | | (equity: drawings) |
| T16 | Owner adds money | | | + | | | (equity: capital) |
| T17 | Move money (drawer → bank, M-Pesa → bank) | | | −/+ | | | (fees → expense) |
| T18 | Warranty swap with supplier (faulty IMEI out, new IMEI in) | 0 net | ± cost difference | | | | |
| T19 | Transfer between locations [Later] | −/+ | 0 net | | | | |

**Essential [Must]:** T1–T9, T12–T15, T17.
**Should Have:** T10 as a single screen, T11, T16, T18.
**Later:** T19.

## 6. Payment methods

Each payment method maps to a **money place** that has its own running balance:
- Cash drawer (one per till)
- Bank account(s)
- Mobile-money till/wallet(s): name is configurable, e.g. "M-Pesa Till 123"
- Card terminal settlement. Card money arrives later and net of fees, so it is a money place that is "in transit" [I].

**Split tender** (part cash, part mobile money) is **Must**: Loyverse supports it, and it's common [V]/[I]. **Mobile-money API integration** (auto-matching payments) is **Later**, and depends on the country [U].

## 7. Theft, loss and discrepancies

- Every stock decrease that isn't a sale needs a **reason** (Damaged, Stolen, Missing-after-count, Used in shop, Sent to supplier) and records **who** did it.
- For serialised items, a count is an IMEI scan; the difference is a named list of missing units.
- For accessories, a count gives a quantity difference valued at average cost.
- Losses are reported **separately** from COGS, so gross margin isn't polluted. This matches Square, where damage and theft don't appear in COGS [V-s].

## 8. Staff and permissions

| Capability | Cashier | Manager | Owner |
|---|---|---|---|
| Sell, take payment | ✔ | ✔ | ✔ |
| Discount above X% / below cost | ✖ (PIN) | ✔ | ✔ |
| Refund / return | ✖ (PIN) | ✔ | ✔ |
| Receive stock | optional | ✔ | ✔ |
| See cost & profit | ✖ | optional | ✔ |
| Adjust stock / write off | ✖ | ✔ (reason required) | ✔ |
| Record expense | optional | ✔ | ✔ |
| Owner withdrawal, reports, settings | ✖ | ✖ | ✔ |

Every action records user, device and time. Nothing is ever deleted: corrections are reversing events [I].

## 9. Essential versus optional, by shop type [I, to validate]

| Need | Tiny accessory shop | Phone shop (1 location) | Multi-branch dealer |
|---|---|---|---|
| IMEI per unit | ✖ | **Must** | Must |
| Customer credit | Should | **Must** [U] | Must |
| Supplier credit | Should | **Must** | Must |
| Wholesale price | ✖ | Should | Must |
| Multi-location | ✖ | ✖ | Must |
| Trade-ins / buybacks | ✖ | Later | Should |
| Repairs | ✖ | Later (separate product) | Later |
| QuickBooks sync | Optional | **Depends on Decision 4** | Must |

The recommended first customer is the **single-location phone shop**.

## 10. Kenya update: additional transactions (see [13](13-new-workflows.md))

| # | Event | Stock | Stock $ | Money place | Owed to us | We owe | Profit pieces |
|---|---|---|---|---|---|---|---|
| T20 | Sell from neighbour (B1): buy from neighbour + sell, one step | +1 −1 | 0 net | + customer payment | (+ if credit) | + neighbour price | Sales +; COGS = neighbour price |
| T21 | Borrowed from neighbour (B3), not yet sold | held, not ours | 0 | | | 0 | |
| T22 | Lent to neighbour (B4) | moves to "with neighbour" | unchanged | | | | |
| T23 | Lent item sold by neighbour | −1 | − cost | | + agreed price | | Sales +; COGS + |
| T24 | Receive "pay when sold" stock (treated as ours on credit) | + | + cost | | | + (shown as *not yet due*) | |
| T25 | A "pay when sold" unit is sold | −1 | − cost | + | | that unit's cost moves to *due now* | Sales +; COGS + |
| T26 | Transfer between locations | − at A (in transit), + at B on receipt | 0 net | | | | |
| T27 | Trade-in (buy from customer) | + (Used) | + agreed price | − (or offset against a sale) | | | |
| T28 | Sale with VAT | as T5 | as T5 | + gross | | VAT payable + | Sales = net of VAT |

Pack units: a carton of 50 received = +50 pieces; a wholesale sale of 2 cartons = −100 pieces.
