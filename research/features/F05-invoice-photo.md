# F05 — Stock-in from an Invoice Photo

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F04 Receiving (approved). The photo only **fills the F04 sheet**; all F04 rules, checks and permissions still apply.
**Founders' constraint: no running cost.** Avoid paid AI services.

## 1. Purpose
The trader photographs (or forwards) the supplier's invoice. The app fills the receiving sheet. **The person only checks and confirms.** Nothing is ever saved without that confirmation.

## 2. Simple flow
1. **Stock in → 📷 Invoice.** Take photos (up to 10 pages), pick from the gallery, or **share** a photo or PDF from WhatsApp into the app.
2. The app reads it, usually in a few seconds. Offline, the photo is kept and read automatically when back online, followed by a notification "Invoice ready to check".
3. The **F04 sheet opens, pre-filled:** supplier, invoice number, date, rows (product, quantity, cost) and the total.
   - Rows the app is unsure about are **yellow**.
   - Rows it couldn't match to a product show the invoice text, e.g. "IP13PRO 256 GRY", with **Pick product** or **New product**.
   - A **totals check** shows ✔ green when the rows add up to the invoice total, or ✖ red with the difference.
4. Fix anything highlighted. Scan the IMEIs for phones (or confirm the ones read from the invoice).
5. Payment step (as in F04) → **Confirm.**

The photo is kept with the delivery as proof.

## 3. How the reading works without running costs

| Layer | What it does | Cost | Notes |
|---|---|---|---|
| **1. eTIMS purchase fetch** *(after KRA certification)* | For suppliers who issue eTIMS invoices, the invoice data is downloaded **from KRA** as exact structured data. No photo needed | Free | KRA's OSCU specification lets the buyer retrieve sales that suppliers registered against the buyer's PIN [V] |
| **2. Phone-based text reading (on-device OCR)** | The phone reads the text in the photo (Google ML Kit Text Recognition v2: free, runs **on the phone, offline**, Latin script) [V-s]. Our own rules then turn the text into rows: quantity, description, unit price, line total, invoice total | Free | Works well on **printed** invoices. **Handwriting is read poorly**: ML Kit's handwriting product is for pen input on screens, not photos [V-s] |
| **3. Supplier memory** | The app remembers each supplier's invoice layout and wording ("IP13PRO 256 GRY" = iPhone 13 Pro 256GB Graphite New) once a person confirms it. The second invoice from the same supplier is matched much better | Free | This improves the more a shop uses it |
| **4. Optional AI helper (Gemini free tier)** | Only for invoices layers 2–3 can't read well (e.g. handwritten). **Off by default; each shop owner chooses** to switch it on (founders' decision) | Free within daily limits | Limits are per project, e.g. around 1,000 requests a day for the smallest model, and they change [S]. **On the free tier, Google may use the content to improve its products** [S, from Google's billing documentation]. See open question 1 |

**Honest expectation:**
- Printed invoices from regular suppliers: good, and getting better with supplier memory.
- Handwritten invoices without the AI helper: the app will often get only some fields right, and the person types the rest in the sheet.
- We will **measure accuracy on real invoices** (100–200 collected during shop visits) before promising more.

## 4. Rules
- **Never saved without a person tapping Confirm.**
- **Totals must match:** if the rows don't add up to the invoice total, Confirm asks "Rows total 98,500, invoice says 100,000. Fix rows or accept the difference?" Accepting is recorded with the user's name.
- **Product matching:** exact barcode or code → match; known supplier wording → match; similar name → yellow suggestion; nothing → "Pick or create product" (F01, approval rules apply).
- **IMEIs on the invoice:** pre-filled, but each must still pass F04's IMEI checks, and **scanning the boxes to confirm is required for IMEI products** (founders' decision). A unit can't be sold until its IMEI is confirmed by a scan.
- **The same invoice twice:** the same supplier + invoice number (or an almost identical photo) → warning "This invoice was already received on <date>".
- **Staff who can't see costs:** they can take and check the photo for **quantities and IMEIs only**. Prices are hidden, and the delivery goes to the owner or manager to check costs (as in F04 §7).
- **Invoice language:** English. Others are not supported in the first version.
- **Pages:** up to 10 photos per invoice, or a multi-page PDF.

## 5. Privacy (shown clearly the first time)
A one-time screen in simple English and Somali, for example:
- On-device reading: "**Your invoice is read on this phone.** It is stored in your shop's account so you can see it later."
- If the AI helper is on: "**Hard-to-read invoices are sent to Google's AI to be read. On the free service, Google may use them to improve its products.** You can switch this off in Settings."

The owner can switch the AI helper off at any time.

## 6. Edge cases (checklist)
1. Blurry or dark photo → "Photo not clear, take again", with tips (flat, good light, whole page).
2. A photo of something that isn't an invoice → "No invoice found".
3. Invoice for a supplier not in the list → supplier name pre-filled as a new (waiting) supplier (F03).
4. A row with a quantity but no price → treated as "price pending" (F04).
5. An invoice in USD → currency detected if printed ("$", "USD"); the rate is pre-filled and editable (F03).
6. Discount on the invoice ("less 5%") → shown as a separate row; the app spreads it across the rows' costs; the totals check includes it.
7. VAT shown separately on the invoice → if the business has VAT **off**, the total cost is used. If VAT is **on**, the VAT amount is also stored (F04).
8. An invoice that covers goods that arrived in two deliveries → receive the first part; the remaining rows can be kept as an **open part** for the next delivery.
9. Daily AI-helper limit reached → the invoice falls back to on-device reading, with the message "Read with basic reader — please check carefully".
10. The phone lacks space or memory for OCR → the photo is uploaded and read on our server using the same free on-device method [I, to test].

## 7. Test examples (acceptance)
- **T1 Printed invoice:** a clear printed invoice with 5 rows from a known supplier → all rows matched; totals ✔; the user confirms in under 30 seconds.
- **T2 Supplier memory:** first invoice from S1 with "IP13PRO 256 GRY" → the user picks the product once; on the second invoice from S1 it's matched automatically.
- **T3 Totals mismatch:** rows read as 98,500, invoice total 100,000 → red; Confirm requires fixing or "accept difference" (logged).
- **T4 Duplicate invoice:** the same S1 invoice number scanned again → warning naming the date and person of the first receipt.
- **T5 Offline:** photo taken offline → saved; after reconnecting, a notification; the sheet opens filled.
- **T6 Staff without cost access:** a storekeeper checks quantities and IMEIs; costs are hidden; the delivery appears to the manager as "check costs".
- **T7 Handwritten, AI helper off:** some rows are blank or yellow; the user completes them by typing; Confirm works normally.
- **T8 Privacy screen:** the first use shows the notice; if the AI helper is off, no photo leaves the shop's account for reading.
- **Accuracy target (pilot):** on printed invoices from known suppliers, a median of ≤ 2 corrections per invoice.

## 8. Founders' answers
1. AI helper: **(c)**, the owner chooses per shop, **off by default**.
2. Scanning boxes to confirm IMEIs read from an invoice: **required** for phones.

## VAT is optional (founders' rule, 2026-10-31; applies to every feature)
- **Business setting "Charge VAT": OFF by default.** Most shops don't deal with VAT [F].
- **When OFF:** no VAT fields, no VAT on receipts. Profit = selling price − cost, exactly as typed.
- **When ON:** the app follows **KRA's rules** (rates such as 16% standard, exempt and zero-rated, and how VAT is shown and claimed). It doesn't invent its own. Products get a VAT type, delivery lines store their VAT amount, and profit is calculated without VAT.
