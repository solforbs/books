# F12 — Owner Dashboard, Alerts, Reorder & Reports

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01–F11 (it reads everything; it creates nothing except orders, via F04).
All founders' answers to the F12 questions were "default". Addition: reorder creates a **professional purchase-order document** (F04 §6, updated).

## 1. Purpose
Answer the owner's questions **in one glance**, warn early (low stock, slow stock, debts, losses), and give full reports and exports when needed.

## 2. Home screen (owner)
One screen of **tiles**. Above them: a **period switch** (Today · This week · This month · This year · Pick dates) and a **location switch** (All · each location). **Tap any tile** to open its list.

| # | Owner's question | Tile shows | Tap opens |
|---|---|---|---|
| 1 | What do I have? | Items in stock (pieces), phones in stock | Stock list (search, filter by category/location) |
| 2 | What is it worth? | Stock value at cost (+ "on the way", "with neighbours") | Value by category / location |
| 3 | What did I sell? | Sales total, number of sales | Sales list |
| 4 | How much did I make? | **Gross profit** and **net profit** (after expenses, losses), or "**incomplete**" if costs are missing | Simple profit report (§5.2) |
| 5 | How much money came in? | Money in by method (Cash, Till, Paybill, Bank, Card) | Money places and movements |
| 6 | Who owes me? | Customers owe X (Y overdue) | Debtors list, most overdue first |
| 7 | Whom do I owe? | **Due now** + total (suppliers, neighbours, unpaid expenses) | "We owe" list (F07) |
| 8 | What's wrong? | Count of alerts: missing, damaged, low stock, slow stock, cash short, unapproved items, unclosed days | Alerts list (§3) |
| 9 | What should I reorder? | Number of items to reorder | Reorder list (§4) |
| 10 | How did the week/month go? | This period vs the previous one (sales, profit, ↑↓ %) | Comparison report |

- A small line under the profit tile: "**Why is cash different from profit?**" → opens the cash-vs-profit explanation (§5.3).
- **Other roles:**
  - **Cashier:** the home screen is the Sell screen plus their own sales today.
  - **Manager:** the same tiles for their locations (cost and profit only if allowed).
  - **Accountant:** reports only.

## 3. Alerts (one list, most important first)
- **Low stock** (§4.1) · **Slow-moving stock** (§4.3) · **Missing/damaged** awaiting decision (F08) · **Cash short/over** above the owner's limit (F11) · **Overdue customers** · **Supplier payments due now** · **Cost missing** products (F04) · **Waiting approvals** (only if such staff exist, G1) · **Unclosed or unapproved days** (F11) · **Transfers on the way too long** (F10) · **Borrowed/lent neighbour items** (F09) · **Sync problems** (devices not synced for > 24 h, G6).
- Each alert has one action button (e.g. "Order", "Approve", "Count", "Remind customer").

## 4. Stock health

### 4.1 Low-stock levels
- **The app suggests** a level for each product: average daily sales over the last 30 days × 7 days (time to restock), rounded up. The owner can change it per product, or set "don't alert".
- New products with less than 14 days of sales → no suggestion until there is enough data; the owner can set one by hand.
- Phones: levels per product (model + storage + colour + condition). There is also an optional **model-level** view ("all iPhone 13 Pro: 2 left").

### 4.2 Reorder list → professional order
- Shows products at or below their level, **grouped by usual supplier** (the last supplier the product came from).
- **Suggested quantity** = enough for about 3 weeks of sales − what's in stock − what's already ordered (F04 orders not yet received). Rounded up to full packs if the supplier sells in boxes or cartons. Editable.
- **Create order** (per supplier) → the **purchase-order PDF** from F04 §6 (logo, business details, PO number, supplier, items and quantities, no prices) → **Send on WhatsApp** or share.

### 4.3 Slow-moving stock
- Items **not sold in 30 days** (the owner can change this) are listed with their value tied up. Phones and other IMEI items show **days in stock per unit** ("IMEI …518: 47 days").
- The tip "consider a lower price" is shown to the owner only. The app never changes prices by itself.

## 5. Reports
All reports have **filters** (period, location, staff, category) and **Export: Excel / PDF**.

1. **Sales:** by day, product, category, staff, location, payment method, retail vs wholesale, customer.
2. **Profit (simple, in plain words):**

   | Line | |
   |---|---|
   | Sales | |
   | − Returns | |
   | − Cost of goods sold | |
   | **= Gross profit** | |
   | − Expenses (by type) | |
   | − Stock losses (by reason) | |
   | − Discounts given / + discounts received | |
   | − Bad debts / + debts recovered | |
   | **= Net profit** | |
   | *Separate, not in profit:* exchange gain/loss (USD), cash short/over | |

   Banners when costs are missing ("profit incomplete") or days are not approved.
3. **Why cash ≠ profit:** starts from profit; adds or removes credit sales not yet paid, stock bought, supplier debts, owner money, advances and deposits held; ends at the change in money. Each line is a short sentence.
4. **Best sellers and slow movers:** top and bottom products by quantity, sales and profit.
5. **Stock:** value by location and category; on the way; with neighbours; days in stock (aging).
6. **Debts:** customers by how overdue (not due, 1–30, 31–60, 61–90, 90+ days); suppliers due now, this week, later; neighbours.
7. **Losses and cash:** stock losses by reason, person and location; cash short/over by person.
8. **Neighbour sales:** items, profit, owed to and by neighbours.
9. **Staff activity:** sales, discounts given, below-minimum approvals, corrections, cancellations and returns per person. This helps the owner spot unusual patterns; it **never accuses**.
10. **Day closes:** each day, who closed it, cash difference, automatic or not, approved or not.
11. **IMEI lookup:** the full life of one phone: received from, cost, moves, sold to, returns, warranty.
12. **Comparison:** any two periods side by side.

**Daily / weekly / monthly PDF summaries** are produced by F11 §3.8. F12 offers the same summaries on demand for any period.

## 6. Exports
- **Excel:** one sheet per report, with raw lines, for an accountant or the owner's own analysis.
- **PDF:** the formatted report with the business details header (F02).
- **Accountant pack** (monthly): profit report, cash-vs-profit, debts both ways, stock value, losses, expenses list, in one ZIP (or several files).

## 7. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Home tiles | ✔ all | ✔ own locations (cost/profit if allowed) | own sales only | stock tiles only | ✖ |
| Reports | ✔ | ✔ own locations | ✖ | stock reports only | ✔ view all |
| Exports | ✔ | ✔ own locations | ✖ | ✖ | ✔ |
| Change low-stock levels | ✔ | ✔ | ✖ | ✖ | ✖ |
| Create orders from reorder | ✔ | ✔ | ✖ | ✖ | ✖ |

## 8. Offline and sync
- Reports are calculated on the device from the data it has. If other devices haven't synced, a banner says "**Figures may be missing sales from 1 device (last synced 3 h ago)**".
- After sync, figures update. A closed day that changes shows "changed after close" (F11).

## 9. Edge cases (checklist)
1. A new shop with no data → tiles show 0, with short "how to start" hints instead of empty charts.
2. Profit for a period including "cost missing" items → profit shown with an "incomplete" label and the count of affected sales.
3. Selected period includes today (not closed) → the label "today so far".
4. A location filter with transfers → stock "on the way" shown once in the business total, not at either location.
5. A product with a low-stock level but marked hidden (F01) → no alert.
6. A supplier for a reorder product is hidden or unknown → grouped under "No supplier — choose".
7. Very large exports (a year of sales) → created in the background; a notification when ready.
8. A manager filters to a location they don't manage → not offered.
9. Percent change from 0 → shown as "new" instead of ∞%.

## 10. Test examples (acceptance)
- **T1 Tiles match:** for any day, every tile equals the sum of that day's records (automated test over random data).
- **T2 Low-stock suggestion:** a charger sells 2/day over 30 days → suggested level 14; stock falls to 14 → alert and reorder entry.
- **T3 Reorder quantity:** 2/day, 10 in stock, 0 on order → suggest about 32 (3 weeks × 2/day = 42 − 10); supplier sells cartons of 20 → rounded to 40.
- **T4 Purchase order PDF:** create from reorder for S1 → PDF with logo, business name, address, phone, PO number, date, S1's details, items and quantities, no prices; WhatsApp opens with the short message.
- **T5 Slow-moving:** IMEI received 47 days ago, not sold → listed with "47 days" and its cost.
- **T6 Profit incomplete:** 3 sales of cost-missing items in the month → net profit marked incomplete, "3 sales without cost".
- **T7 Why cash ≠ profit:** a month with profit 100,000, credit sales unpaid 40,000, stock bought on cash 50,000, owner took 20,000 → explanation lines add up exactly to the change in money.
- **T8 Manager scope:** a manager of Shop 1 cannot see Shop 2's figures.
- **T9 Sync banner:** one device offline for 3 h → the banner shows on reports.
- **T10 Export:** a monthly accountant pack contains the 6 files, and the totals match the on-screen reports.
