# F09 — Getting Goods from (and Lending to) Neighbour Shops

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F03 (suppliers, neighbour tick), F04 (receiving), F06 (selling), F07 (payments), F08 (returns/warranty).
All founders' answers to the F09 questions were "default"; they are written in below.
This practice comes from the founders' market knowledge [F]; no competitor documents it. Validate the wording with traders.

## 1. Purpose
Shops often sell goods they don't have by fetching them from a neighbouring shop, and sometimes lend their own goods to neighbours. Without this feature:
- the IMEI and the profit are never recorded;
- stock counts break, because something was sold that was never in stock;
- the debt to the neighbour lives only in someone's head.

This feature makes the common case **one short step**.

## 2. Simple flows

### 2.1 Sell from a neighbour (the common case)
1. **Sell** → search "iPhone 13 Pro" → **0 in stock** → **Get from neighbour**. (Also: cart → More → *Add item from neighbour*.)
2. Pick the neighbour (neighbour shops first; **+ New neighbour** = name + phone).
3. Pick the product (or quick-add it, F01) → **neighbour's price** (e.g. 95,000) → **scan the IMEI** (required for IMEI/serial products).
4. **Pay the neighbour:** *Later today* (default) or *Now* (cash/M-Pesa).
5. Back in the cart, the line shows "🤝 from N1". The selling price is pre-filled from the product price (editable, bargaining rules apply). The app shows **"Your profit: 5,000"** to people allowed to see profit.
6. **Pay** and **Done** as a normal sale.

### 2.2 Borrow to show the customer ("on approval")
**Get from neighbour → Borrow to show** → neighbour, product, IMEI → item is marked **"Borrowed from N1"**.
- Customer buys → it becomes 2.1 (the neighbour's price is asked at that moment).
- Customer doesn't buy → **Return to neighbour** → closed, nothing owed.

### 2.3 Lend to a neighbour
**Stock → Lend to neighbour** → neighbour → scan items → **agreed price** each → Save → the items show as **"With N1"**.
- **N1 sold it / keeps it** → **Mark as sold to N1** → N1 owes the agreed price (default due today).
- **N1 returns it** → **Returned** → back in stock.

## 3. What happens in the background

| Case | Stock | Stock value | Debt | Profit |
|---|---|---|---|---|
| **Sell from neighbour** | in and out at once (net 0) | net 0 | **we owe N1** the neighbour price (unless paid now) | selling price − neighbour price |
| **Borrowed, not sold** | held at our location, **not ours** | not counted | nothing | — |
| **Borrowed, then returned** | gone | — | nothing | — |
| **Lent, not yet sold** | still ours, shown "With N1", **not sellable here** | counted | nothing | — |
| **Lent, then sold to N1** | out | − cost | **N1 owes us** the agreed price | agreed price − our cost |

- The neighbour is a **contact that can be both supplier and customer** (F03 §6), so **offset** works ("we owe N1 95,000, N1 owes us 60,000 → offset").
- **IMEI history:** "From N1 (95,000) → sold to <customer> (100,000) on <date> by <cashier>".
- **Default payment rule for neighbours: same day.** At **day close** (F11), the app lists:
  - neighbours still to pay today;
  - borrowed items not returned;
  - items lent out.

## 4. Rules
- **IMEI required** for IMEI/serial products, checked as in F04:
  - an IMEI that is **in our stock** → blocked (it's ours, not the neighbour's);
  - an IMEI we **sold before** → warning (e.g. the neighbour bought it from us); allowed after confirmation.
- **Minimum price:** selling below the neighbour's price needs an owner or manager PIN (as in F06).
- **Who:** anyone who can sell (cashiers too). **"Pay neighbour now"** during this flow is allowed for cashiers (an exception to F07, where only owners and managers pay suppliers), because the money usually goes straight to the neighbour [I]. The owner can switch this off.
- **Warranty and returns:** our shop handles them for the customer (F08). For a faulty item, **Return to supplier → N1** creates the claim against the neighbour.
- **The customer leaves before paying** for a cart with a neighbour item:
  - the app asks **Return to neighbour** (nothing owed); or
  - **Keep it** (it becomes a normal purchase from N1, now in our stock, owed to N1).
- **A borrowed item is lost or damaged** while with us → owner or manager converts it to a purchase from N1 (we owe N1), then a stock loss (F08).
- **A lent item comes back damaged** → owner or manager chooses: accept back as damaged (loss), or mark as sold to N1 at the agreed price.
- **A neighbour's price not known yet** → allowed as "price pending" (F04). Profit is unknown until it's entered.

## 5. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Sell from neighbour / borrow to show | ✔ | ✔ | ✔ | ✖ | ✖ |
| Pay neighbour now (in this flow) | ✔ | ✔ | ✔ (owner can switch off) | ✖ | ✖ |
| Lend to neighbour / mark sold / returned | ✔ | ✔ | ✔ (owner can switch off) | ✔ | ✖ |
| Add a new neighbour | ✔ | ✔ | ✔ (waiting, if approvals apply) | ✔ (waiting) | ✖ |
| Convert lost borrowed item / damaged lent item | ✔ | ✔ | ✖ | ✖ | ✖ |

## 6. Reports
- **Owner's daily summary:** "**Sold 3 items from neighbours, profit 12,000. You still owe neighbours 285,000. 1 borrowed item not returned. 2 items lent to N2 (worth 120,000).**"
- A per-neighbour list: owed to them, owed by them, borrowed, lent.
- Neighbour sales appear in normal sales and profit reports, marked "from neighbour".

## 7. Offline
Works offline. **The same neighbour IMEI** used on two offline devices → flagged after sync, as in F06.

## 8. Edge cases (checklist)
1. The product doesn't exist in our list → quick add (F01; waiting if approvals apply).
2. The neighbour gives two phones and the customer buys one → the second is "Borrowed" (return it) or "Keep it" (purchase).
3. Neighbour paid in M-Pesa → the code is optional for outgoing payments (it's our payment, not the customer's).
4. The customer buys on **credit** an item from a neighbour → allowed; we still owe the neighbour.
5. A neighbour is also a regular supplier → same contact; neighbour tick stays.
6. Lent items not marked sold or returned after X days (default 3) → reminder to the owner.
7. A borrowed item has been held overnight → listed at day close; the next day it stays "Borrowed" with a warning.
8. A neighbour's phone is returned by our customer within our return time → F08 return. Choose "Back to supplier (N1)" or "Back to stock" (it's now ours).

## 9. Test examples (acceptance)
- **T1 Sell from neighbour, pay later:** 0 stock of iPhone 13 Pro; get from N1 at 95,000 with IMEI X; sell at 100,000 M-Pesa → sale 100,000, profit 5,000, owe N1 95,000 (due today), stock still 0, IMEI X history shows N1 → customer.
- **T2 Pay now:** same, but paying N1 95,000 cash now → drawer −95,000 +100,000 (if the customer paid cash), owe N1 0.
- **T3 Borrow, not bought:** borrow IMEI Y from N2 → status Borrowed; the customer leaves; Return to neighbour → no debt, no stock change.
- **T4 Lend and sold:** lend 2 chargers (cost 450) to N2 at 600 each → "With N2"; N2 sells both → N2 owes 1,200; profit 300.
- **T5 Offset:** we owe N1 95,000; N1 owes us 60,000 → offset → we owe 35,000.
- **T6 IMEI ours:** using an IMEI that is in our stock as a neighbour item → blocked.
- **T7 Day close list:** at day close the app lists "Pay N1 95,000", "Borrowed IMEI Y from N2 not returned".
- **T8 Warranty via neighbour:** a customer returns IMEI X faulty within warranty → replaced from our stock; IMEI X becomes a claim against N1.
