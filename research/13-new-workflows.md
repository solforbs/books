# 13 — New Workflows from the Founders' Input

Design proposals [I], based on practices the founders described [F]. None of the competitors we studied documents these workflows, so we have **no evidence yet** that traders will use them this way. Validate each one in shop interviews.

---

## W-A. Stock-in by photographing the supplier invoice

**Goal:** the trader photographs the supplier's invoice; the app fills everything in; the trader only confirms.

### Three sources of supplier invoices, best first
1. **eTIMS invoices from VAT-registered suppliers.** When the shop is connected to eTIMS, the supplier's sale already exists at KRA. The OSCU API lets the buyer fetch "purchase transaction information… registered to eTIMS Server by a seller" [V, see [12](12-kenya-context.md)]. The data is exact, so **no photo is needed**. Scanning the invoice's QR code can identify the invoice for confirmation (the format of the QR content still needs to be checked [U]).
2. **Printed invoices (computer or ETR).** The photo is read by a document-reading AI model.
3. **Handwritten or carbon-copy invoice books.** The same model reads them, but expect lower accuracy. We don't yet know what share of invoices look like this [U].

### Flow
1. **Receive stock → 📷 Invoice.** The trader takes 1–3 photos.
2. The app extracts the supplier name, invoice number, date, lines (description, quantity, unit price, total), VAT and grand total, and any IMEIs or serials printed on the invoice.
3. **Matching:**
   - the supplier is matched to an existing one (or a new one is proposed);
   - each line is matched to a product variant. The app **learns supplier wording** (e.g. "IP13PRO 256 GRY" → *iPhone 13 Pro 256GB Graphite*), and the trader confirms each mapping only once per supplier.
4. **The confirm screen shows only what needs attention:**
   - lines with low confidence are highlighted;
   - new products are pre-filled for creation;
   - the totals check (sum of lines = invoice total) is shown in green or red.
5. **IMEIs:** if they were printed on the invoice, the app pre-fills them and the trader scans the boxes to confirm. If not, the trader scans the boxes as before.
6. **Payment terms:** *Paid (cash / M-Pesa / bank)*, *Credit until date*, or *Pay when sold* (see W-C).
7. **Confirm** → the same records as manual receiving ([04 J1](04-user-journeys.md)), plus the photo kept as evidence.

### Rules
- **Nothing is saved without a human confirming.** The AI only fills the form.
- If the line totals don't match the invoice total, the receipt cannot be saved until it's fixed or the trader accepts the difference.
- Every photo is stored with the receipt, for disputes and audit.
- The invoice is marked **eTIMS-backed** or **not eTIMS-backed** (affects tax deductibility, see [12 §2.1](12-kenya-context.md)).

### Risks / unknowns
- Extraction accuracy on real Kenyan invoices [U]. **Collect 100–200 real invoice photos in discovery** and measure field-level accuracy before promising this.
- Cost per scan of the AI model; data-protection rules for invoice images under Kenya's Data Protection Act [U].
- This is a justified AI use: it replaces the most typing-heavy task. It must not delay the MVP if accuracy is poor. The manual and scan flow stays as the fallback.

---

## W-B. Neighbour sourcing ("I don't have it, let me get it from next door")

Practice described by the founders [F]: a customer asks for an iPhone 13 Pro; the shop doesn't have one; staff fetch one from a neighbouring shop and sell it with a margin added.

### Variants and how to record them

| Situation | What the app records | Stock value | Debt |
|---|---|---|---|
| **B1. Fetched and sold immediately, neighbour paid later** | One combined action: **"Sell from neighbour"**. It creates a purchase from the neighbour (as a supplier) and the sale, in one step | Unit passes through: in, then out | We owe the neighbour |
| **B2. Fetched and sold, neighbour paid immediately** | Same, with the purchase marked paid | Passes through | None |
| **B3. Fetched "on approval"; the customer may not buy** | **"Borrowed from neighbour"**: the unit is held but *not ours*. Then: Sold → becomes B1, or Returned → closed | **Not** in our stock value | Only owed once sold |
| **B4. We lend our item to a neighbour** | **"Lent to neighbour"**: the unit is out of the shop but still ours, with an agreed price | Still in our stock value, shown as "with neighbour" | Once the neighbour sells it, the neighbour owes us (or it's returned) |

### Flow for B1 (the common case, hypothesis)
1. In **Sell**, search "iPhone 13 Pro". Result: *0 in stock* → button **Get from another shop**.
2. Pick the neighbour (saved as a supplier, flagged "neighbour shop"); enter their price, e.g. 95,000; scan the IMEI.
3. The sale continues at the selling price, e.g. 100,000. The app shows **"Your profit: 5,000"**.
4. Pay → the neighbour is owed 95,000 (or paid now via M-Pesa).

**Why it matters:**
- without this, the IMEI and the profit are never recorded;
- stock counts break, because the device was "sold" without ever being in stock;
- the debt to the neighbour lives only in someone's head.

**Daily summary line:** "Today you sold 3 items from neighbours, profit 12,000, you owe neighbours 285,000."

**Later (network effect, idea only):** if the neighbour also uses our app, the lending and borrowing could be confirmed on both sides automatically.

---

## W-C. Credit everywhere: smart tracking of who owes what, and what is due now

The founders want the system to "differentiate goods on credit vs bought in cash, customers on credit vs cash, and tell the owner how much credit needs to be paid" [F].

### Supplier credit terms (chosen once per supplier, changeable per receipt)

| Term | Meaning | What the app calculates |
|---|---|---|
| **Cash** | Paid on receipt | Nothing owed |
| **Credit, N days** | Pay by a due date | Due date, overdue days |
| **Pay when sold** | Pay for each unit after it's sold (consignment-like) | **Amount due now = cost of units from this supplier already sold − payments made.** The rest is "owed later" |
| **Part paid** | Any of the above with a deposit | Balance |

Note: under *Pay when sold*, the goods may legally still belong to the supplier (true consignment) or may already be ours on credit. The accounting differs: true consignment stock is **not** in our stock value. **We must ask in interviews** which applies [U]. The app can support both through a per-supplier setting.

### Owner screens
- **"You owe suppliers":** total. Split into **Due now** (overdue + sold-not-paid), **Due this week** and **Not yet due**. One tap: *Pay* (full or part; cash, M-Pesa or bank).
- **"Customers owe you":** total, split by **overdue / not yet due**. Per customer: a statement shareable on WhatsApp, and a payment reminder template.
- **"Credit picture":** "Goods you hold that are not yet paid for: 1.2M". This answers "how much of my shop really belongs to me?"
- **Profit is never affected by whether something was paid in cash or on credit.** Only cash is. The cash-versus-profit bridge ([06](06-data-flows.md)) explains the difference in plain words.

### Wholesale credit sales (wholesaler → retailer)
- A customer type of **Trader**, with a credit limit, default terms and the wholesale price list.
- A sale above the credit limit needs owner or manager approval.
- Partial payments are applied to the oldest invoices first; a statement shows each invoice and payment.

---

## W-D. Retail + wholesale in one business; units of measure

- **Shop profile at setup:** Retail only / Wholesale only / Both. This decides which screens and prices appear.
- **Units:** each product has a base unit (piece) and optional pack units (box = 10, carton = 50). Purchases and wholesale sales can be in cartons, retail in pieces. Stock is always held in base units.
- **Breaking a carton** happens automatically: selling 1 piece when only cartons are in stock just reduces pieces, so no "open a carton" step is needed [I].
- **Prices:** retail price and wholesale price (optionally quantity tiers, *Should*). At checkout, the price list follows the customer type, or the cashier toggles Retail/Wholesale.
- **IMEI products** are always counted in pieces. A carton of 10 phones means scanning 10 IMEIs.

## W-E. Multiple locations and roles

- **Locations:** shop(s) and store/warehouse. Every stock event belongs to a location.
- **Transfers:** "Send stock" (scan items or IMEIs) → status *in transit* → the receiving location taps "Received" and confirms what arrived. This matches eTIMS "stock movement" in/out [V].
- **Roles:**
  - Owner (everything, all locations);
  - Manager (one or more locations);
  - Cashier/Sales (sell, receive payments);
  - Storekeeper (receive, transfer, count; no prices or profit);
  - Accountant (read-only plus exports).

## W-F. Trade-ins and repairs (some electronics shops)

- **Trade-in (Should):** a "Buy from customer" action. It is a purchase from an individual: capture the IMEI and the seller's name, phone and ID (legal requirements [U]), and the agreed price. The trade-in value can be used as payment towards a sale. The device then enters stock as *Used* condition at that cost.
- **Repairs (Later):** a separate module (job ticket, parts used from stock, labour charge). Parts consumption reuses stock-out events.

## W-G. Languages
- **English and Somali** for every screen, receipt and message template. Somali uses the Latin alphabet, written left to right, so it needs no special layout.
- Keep wording very short and use icons. Professional translation and a review by Somali-speaking traders are required [I]. Avoid accounting jargon in both languages.
