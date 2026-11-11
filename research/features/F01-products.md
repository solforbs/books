# F01 — Products (the product list)

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: nothing. Feature 2 (Locations & staff) adds the real roles; this spec assumes the roles Owner, Manager, Cashier and Storekeeper.

## 1. Purpose
Let any shop put its goods into the system **quickly and correctly**, without duplicates. Every later feature (stock-in, selling, counting, eTIMS) depends on this list being clean.

## 2. In scope / not in scope

| In scope | Not in scope (later features) |
|---|---|
| Adding, editing, hiding products | Quantities and stock (F04 "Starting stock" / stock-in) |
| Creating several versions at once; copying a product | IMEIs of actual units (F04, recorded when stock comes in) |
| Pack units (piece / box / carton) and their barcodes | Suppliers (F03) |
| Prices: retail, wholesale, per-location, minimum | Discounts at the till (F06) |
| VAT type, warranty, photo, category, brand | eTIMS sending (F13); the fields are only reserved here |
| Approval of new products by owner or manager | |
| Duplicate checks; merging duplicates | |
| Printing barcode stickers | |
| Excel import and stock-book photo import (product list part only) | |

## 3. What a "product" is
- **A product = one thing with one price and one stock.** Each **storage + colour + condition** combination is a separate product.
  *Example:* "iPhone 13 Pro 128GB Blue New" and "iPhone 13 Pro 128GB Blue Ex-UK" are two products.
- Each product has a **tracking type**:
  - **IMEI**: phones and tablets with SIM. Every unit gets IMEI 1 (required) and IMEI 2 (optional) when it is received.
  - **Serial number**: laptops, TVs, speakers and so on (the owner chooses this per product).
  - **Quantity only**: chargers, cables, cases and other goods.
- **Model group** (internal): products with the same brand + model (e.g. all "iPhone 13 Pro" products) are linked, so we can show "all iPhone 13 Pro" in search and reports.

## 4. Fields

| Field | Required? | Notes |
|---|---|---|
| Name | Yes | Built automatically for phones and laptops (§6); typed for other goods |
| Category | Yes | Owner's own list (Phones, Laptops, Chargers, …). No ready-made list |
| Brand | Phones/laptops: yes; others: optional | Owner's own list; grows as people add brands |
| Model | Phones/laptops: yes | Typed once, then suggested |
| Storage, Colour, Condition | Phones/laptops: yes | Picked from lists the owner can edit. Starter values: conditions New / Ex-UK / Refurbished / Used. Colours and storage sizes start empty and grow as they are added |
| Tracking type | Yes | IMEI / Serial / Quantity. The default comes from the category (Phones → IMEI) |
| Base unit | Yes | Default "piece" |
| Pack units | Optional | e.g. Box = 10 pieces, Carton = 50 pieces. **Not allowed for IMEI/serial products** (each unit is scanned) |
| Barcode(s) | Optional | One or more per unit/pack (§7) |
| Retail price | Yes, except for "waiting" products (§8) | Per base unit; VAT-inclusive when VAT is on |
| Wholesale price | Optional | Per base unit and/or per pack unit (e.g. 12,000 per carton) |
| Per-location price | Optional | Overrides the business price at one location |
| Minimum selling price | Optional | Owner sets it. If empty, the minimum = the latest buying cost (once stock exists) |
| VAT type | Only when the business turns VAT on | Then follows KRA's rates (standard 16%, exempt, zero-rated). Hidden when VAT is off |
| Can be given free | Optional tick | e.g. covers and screen protectors given free with a phone. Price 0 is then allowed **without a PIN** and recorded as "Given free (promotion)" (added with F08) |
| Warranty | Optional | In months; printed on the receipt with the IMEI/serial |
| Photo | Optional | One photo |
| Status | System | Waiting approval / Active / Hidden |
| eTIMS fields | Reserved, not shown yet; **never required** in the first version | KRA item classification code, quantity unit code, packaging unit code, country of origin, product type, eTIMS item code. Filled in F13 |

## 5. Ways to add products
1. **Add one product:** a form showing only the fields relevant to the category.
2. **Create several at once:** pick a category, brand and model, then tick storages × colours × conditions. The app shows the list of products it will create (e.g. 2 × 3 × 1 = 6). The user sets a price per row (or one price for all, then edits) and can untick rows → Create.
3. **Copy product:** opens a filled-in form; change the colour, say, and save.
4. **Quick add from an unknown barcode:** while receiving stock or selling, scanning a barcode the app doesn't know offers "Add new product". This is a short form: category, name parts and price if allowed. The product is saved as **Waiting approval**.
5. **Excel import:** download a template, or upload the shop's own sheet and match its columns. A **preview** shows each row as *New*, *Possible duplicate* or *Error*; the user fixes or skips rows, then confirms.
6. **Stock-book photo:** photograph pages of the paper stock book. The app reads the names and prices and shows the **same preview as the Excel import**. Nothing is saved until the user confirms each row. Quantities in the book are kept for F04 Starting stock.
7. **Scan to search:** scanning any barcode in the product list either opens that product or offers to add it.

## 6. Automatic names
- Pattern for phones/laptops: **Brand Model Storage Colour Condition**, e.g. "Samsung A15 128GB Black New".
- The app shows a **preview** before saving: "Samsung A15 128GB Black New — correct?"
- Typed models are cleaned up (extra spaces removed, consistent capital letters) and **suggested** next time.
- The app only joins what was entered. **The typed model is the only weak point.** Suggestions, the duplicate check (§9) and approval (§8) reduce mistakes.
- Names can be corrected later. Past sales then show the new name; the history keeps the old one.
- Product names are not translated. Screens and labels are in English or Somali.

## 7. Barcodes and stickers
- A product can have several barcodes: the manufacturer's barcode, and different barcodes for piece, box and carton.
- **Shop-generated barcodes always belong to exactly one product/pack.**
- **Manufacturer barcodes:**
  - Under the GS1 rules, each colour/size variant should carry its own barcode number (GTIN) [V: GS1 GTIN Management Standard]. So genuine boxes of the same model in different colours or storage should have **different** barcodes.
  - **Condition is not part of the manufacturer's barcode.** A New and an Ex-UK "iPhone 13 Pro 128GB Blue" can carry the **same** box barcode [I].
  - Boxes from grey imports, refurbishers or clone products may not follow GS1 rules at all [U].
  - **Rule:** a manufacturer barcode may be shared **only by products that differ in condition alone** (same brand, model, storage and colour). Scanning it asks "New or Ex-UK?". Sharing it with any other product is blocked.
  - For IMEI products this rarely matters: scanning the **IMEI** always finds the exact unit and product.
- **Own barcodes** for goods without one: the app generates a shop barcode. Proposed format: **EAN-13 with prefix 20–29**. GS1 reserves this range as "Restricted Circulation Numbers" for in-store/company use [V-s: GS1 General Specifications]. Each country's GS1 office decides how the range is used (some use parts of it for weighed items with the price inside the code), and we have not confirmed GS1 Kenya's rules [U]. The app guarantees the code is unique inside the business. If a supplier's goods arrive already carrying a 2x code from another shop and it clashes with ours, the clash is shown and the user picks the correct product.
- **Printing:** small Bluetooth label printers and A4 sticker sheets on a normal printer. The user chooses the product, how many stickers, and what to print (name, price, barcode).
- **IMEI barcodes:** phone boxes carry IMEI barcodes. In the product list, scanning a 15-digit IMEI that the app knows opens that unit's product. Before stock exists, it says "This is an IMEI, not a product barcode".

## 8. Approval of new products
- **Anyone can add** a product.
- If an **Owner or an approved Manager** adds it, it is **Active** immediately.
- If anyone else adds it, it is **Waiting approval**:
  - It **can be received and sold** immediately, so the shop is never blocked. It shows a ⏳ label everywhere.
  - It appears in the **approval list** for the owner and approving managers, with a count badge.
  - **Price:** the owner (or an approving manager) sets prices. If a waiting product has no price and must be sold now, the cashier types a price for **that sale only**. The sale is flagged for the approver to review. *(Confirmed by the founders.)*
- **The approver can:**
  - **Approve**: optionally fix the name, category or price first.
  - **Same as existing product → merge**: everything (stock, IMEIs, sales, barcodes) moves to the existing product, and the waiting product disappears. A merge note stays in the history.
  - **Reject**: allowed only if the product has no stock and no sales; otherwise it must be merged.
- **Tracking:** every product records who added it, when, where (location, device) and how (form, quick add, import, photo). It also records who approved, merged or rejected it, when, and what they changed.
- Owner settings: which managers can approve products.

## 9. Duplicate checks

| Check | Result |
|---|---|
| Same barcode already used | **Blocked**. "This barcode belongs to <product>". *Exception:* a manufacturer barcode on products that differ only in condition (§7) is allowed, after confirmation |
| Same brand + model + storage + colour + condition (after cleaning spaces and capitals) | **Blocked**. Offer to open the existing product |
| Similar name (e.g. "Type-C cable 1m" vs "USB C cable 1m"), or a similar model ("A15" vs "Galaxy A15") | **Warning**: shows the similar products. The user taps "Not the same, create" or picks the existing one. Their choice is recorded |
| Import or photo rows that duplicate each other or existing products | Shown as *Possible duplicate* in the preview |
| Two devices create the same product while **offline** | After sync, the second one goes to the approval list as a **possible duplicate** for merging. Neither device is blocked |

## 10. Editing, hiding, history
- Edits are kept in a **history**: who changed what, from what to what, and when. Price history is visible to the owner.
- **Hide** instead of delete. Hidden products don't appear in search or selling, but stay in old sales and reports. They can be unhidden. A product with stock remaining can't be hidden: the app warns "15 in stock — sell, move or adjust first".
- **Tracking type can't be changed** once the product has stock or sales (e.g. Quantity → IMEI). Instead, create a new product and move the stock (F08).
- **Pack size can't be edited** once used (carton = 50 → 40). Instead, retire the old pack and add a new one, so old records stay correct.
- **Price changes** apply from now on. Past sales keep their price.

## 11. Permissions

| Action | Owner | Manager | Cashier | Storekeeper |
|---|---|---|---|---|
| See products and selling prices | ✔ | ✔ | ✔ | ✔ by default (the owner can hide prices from storekeepers) |
| Add product | ✔ Active | ✔ Active if approver, else Waiting | ✔ Waiting | ✔ Waiting |
| Approve / merge / reject | ✔ | ✔ if allowed | ✖ | ✖ |
| Set or change prices, minimum price | ✔ | ✔ if allowed | ✖ | ✖ |
| See cost and profit | ✔ | if allowed | ✖ | ✖ |
| Edit, hide products | ✔ | ✔ if allowed | ✖ | ✖ |
| Print stickers | ✔ | ✔ | ✔ | ✔ |
| Import (Excel or photo) | ✔ | ✔ (rows become Waiting if not an approver) | ✖ | ✖ |

## 12. Multi-location and offline
- The product list is **shared by the whole business**. Prices are business-wide, with optional per-location prices.
- Everything in this feature works **offline**. Adding, editing and printing sync later. Conflicts:
  - **Same product edited on two devices:** each field keeps the latest change, and the owner sees a "changed on 2 devices" note for price conflicts.
  - **Same barcode added offline on two devices:** after sync both are flagged, and the approver chooses the correct one.

## 13. Edge cases (checklist)
1. Unknown barcode during a sale, with the customer waiting → quick add as Waiting, sell at a typed price, flagged.
2. A barcode on the box that is **the same for different colours or storage** (grey imports or clones not following GS1) [U] → the second product is blocked. The user creates a shop barcode for that colour. Shared barcodes for **New vs Ex-UK** are allowed (§7). **Check real boxes during Luthuli Avenue visits:** photograph the box labels of 20–30 popular models across colours, storage sizes and New/Ex-UK.
3. A product without a barcode → generate a shop barcode, or sell by search.
4. Two products accidentally merged → **un-merge is not supported**; correct by moving stock (F08). The merge screen asks for confirmation and shows exactly what will move.
5. Typo in the model creates "A51" instead of "A15" → the approver fixes the name on approval. If already approved, edit the name; sales follow the product.
6. Importing 500 rows where 40 are possible duplicates and 10 have no price → the preview shows each group; the user can bulk-skip or fix rows; rows without a price import as Waiting.
7. Stock-book photo that can't be read clearly → the row is shown in red with the photo crop; the user types it or skips it.
8. Price set below the minimum price → warning to the owner when saving.
9. Hiding a product that has waiting sales offline → allowed; the sales still sync.
10. Owner deletes a category that has products → blocked; move the products first.
11. Very long names → shortened on stickers and receipts; the full name is kept.
12. Somali screen labels with English product names → mixed on one screen is fine.
13. IMEI product given a pack unit → blocked with an explanation.
14. Same product needed with a different price at Shop 2 → per-location price, not a new product.

## 14. Test examples (acceptance)
- **T1 Several at once:** brand Apple, model "iPhone 13 Pro", storage {128, 256}, colours {Blue, Gold, Graphite}, condition {New} → 6 products created, named "Apple iPhone 13 Pro 128GB Blue New" and so on; all linked to model group "Apple iPhone 13 Pro".
- **T2 Duplicate parts:** creating "Apple  iphone 13 pro 128gb blue new" (extra space, lower case) → blocked as already existing.
- **T3 Similar name:** "USB C cable 1m" when "Type-C cable 1m" exists → warning listing it. "Not the same" → created; the choice is logged with user and time.
- **T4 Barcode reuse:** adding barcode 6901234567892 to a second product → blocked, naming the first product.
- **T5 Waiting product:** a cashier quick-adds "Oraimo 20W charger" → status Waiting, sellable, shown in the approval list with "added by <cashier>, at <location>, via quick add".
- **T6 Merge:** a manager (allowed) merges the waiting "Oraimo charger 20W" into the existing "Oraimo 20W Charger" → its 3 sales and 10 stock move to the existing product; the waiting product disappears; history shows the merge by the manager.
- **T7 Reject blocked:** rejecting a waiting product that has 1 sale → not allowed; only merge is offered.
- **T8 Shop barcode:** generating a barcode for "Phone case generic" → a unique EAN-13 starting with 2; printing 20 stickers to a Bluetooth printer and to an A4 sheet both work.
- **T9 Tracking change blocked:** changing an IMEI product with stock to Quantity → blocked with an explanation.
- **T10 Offline duplicate:** two phones, both offline, each create "Tecno Spark 20 128GB Black New" → after sync, one remains and the other appears in the approval list as a possible duplicate for merging.
- **T11 Excel import:** a 200-row sheet with 3 duplicate barcodes and 2 rows without a price → preview: 195 new (2 as Waiting with no price), 3 blocked duplicates. Confirming creates the products in one batch, recorded as "Import by <user>".
- **T12 Pack units:** "Earphones X" with Carton = 50 and its own barcode. Scanning the carton barcode in search opens the product with the "Carton (50)" pack selected.

## 15. Founders' answers and remaining checks
1. Waiting product with no price, sold before approval: **yes**, the cashier types a price for that sale and it is flagged for review (§8).
2. Manufacturer barcodes by colour/storage: **founders not sure.** GS1 rules say variants get different barcodes; condition doesn't. The spec handles both (§7). **Still to do: photograph real boxes in Luthuli Avenue shops** (web research cannot answer this).
3. Storekeepers see selling prices **by default**; the owner can hide them.
4. Still to confirm: GS1 Kenya's rules for prefixes 20–29 (§7).

## Sources
- GS1 GTIN Management Standard: https://ref.gs1.org/standards/gtin-management/
- GS1 General Specifications (Restricted Circulation Numbers): https://ref.gs1.org/standards/genspecs/
- GS1 summary of prefixes 20–29 by member organisation (PDF; could not be fetched): https://www.gs1.org/docs/barcodes/SummaryOfGS1MOPrefixes20-29.pdf

## Approvals only when they are needed (applies to F01, F02, F03 and every later feature)
- **A shop run by the owner alone, or only by owners and approving managers, never sees an approval step.** Everything they add is active immediately, and no "waiting" lists or badges appear.
- Approval steps appear only once the business has staff who are **not** approvers (e.g. a cashier or storekeeper). They then apply only to what those staff add.
- Many shops are run by one or two people [F], so this keeps the app simple for them.

## VAT is optional (founders' rule, 2026-10-31; applies to every feature)
- **Business setting "Charge VAT": OFF by default.** Most shops don't deal with VAT [F].
- **When OFF:** no VAT fields, no VAT on receipts. Profit = selling price − cost, exactly as typed.
- **When ON:** the app follows **KRA's rules** (rates such as 16% standard, exempt and zero-rated, and how VAT is shown and claimed). It doesn't invent its own. Products get a VAT type, delivery lines store their VAT amount, and profit is calculated without VAT.

## 16. Founders' decisions during the build of Slice 1b (2026-11-10 and 2026-11-11)
These answers settle points the original spec left open. The build follows them.
1. **Where a product was added:** the shop or store the person was working in is recorded in the product's history and audit entry (with who, when and how). The **device** is recorded later, with the device features.
2. **Shared manufacturer barcode** between products that differ only in condition (New / Ex-UK): allowed. Scanning it asks "New or Ex-UK?", and that question is the confirmation.
3. **Typed-name products:** an exact same name is blocked as a duplicate. The person is taken to the existing product. When the Receiving feature (F04) is built, that message also offers **"Add stock to it"**, so they add the quantity there.
4. **Merging** is allowed from waiting, active or hidden products into an active or waiting product. It cannot be undone. Only approvers can merge.
5. **Hiding** works on active and waiting products; unhiding restores the previous status.
6. **Rejecting** a product frees its barcodes; a hidden product keeps blocking its name and barcodes.
7. The typed **condition** is shown in the standard spelling ("ex uk" becomes "Ex-UK").
8. **Barcode rule:** letters, digits and `-` `.` `/`, 3 to 43 characters. This covers EAN-8/13, UPC-A/E, ITF-14 carton codes and Code 39 / Code 128 shop labels. A 15-digit number that is a valid IMEI is refused as a barcode ("This is an IMEI, not a product barcode").
9. **Everyone in the business, including the accountant, can read** products, categories and suggestions.
10. **Products with typed names** (laptops, TVs, chargers and so on) have no required parts. **Categories "built from parts"** (phones) require all five parts: brand, model, storage, colour and condition.
11. **Merge target and default list:** the product list shows active and waiting products by default; hidden, merged and rejected ones only when asked.

