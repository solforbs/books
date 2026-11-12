# Open questions for the founders

Founders' rule: **no assumptions**. Anything the approved specs do not state is listed here, with what the build currently does (the simplest, most restrictive behaviour). Answer when convenient; the build changes to match.

Last updated: 2026-11-11 (evening).

## Answered by the founders (2026-11-11), to be built
- **P1** Barcodes are case-insensitive (ABC-123 = abc-123).
- **P3** Waiting products stay visible to everyone in the normal list.
- **P4** Pack price changes are recorded in the product history.
- **P5** Add the owner switch "hide selling prices from storekeepers".
- **S2/S3/S4/S5 (suppliers)** Waiting suppliers stay visible with a waiting tag; completing a waiting supplier may change everything; people who only receive stock see just name, phone and payment rule; no neighbour filter now.
- New question that follows from the last answer: receiving staff will need a supplier's **currency** when receiving goods (F04), but they cannot see it now. Decide when building receiving.

## Products (Slice 1b)

| # | Question | What the build does now |
|---|---|---|
| P1 | **Barcode letters:** should `ABC-123` and `abc-123` count as the same barcode? | They are different. A scanner that sends lower case would then miss an upper-case code. |
| P2 | **Similar-name check on large catalogues:** the check looks at every product of the business. With thousands of products it gets slow (about 4 s for a 100-row bulk at 1,100 products). Narrow it down, and how? | Checks every product. Fine for a few hundred. |
| P3 | **Waiting products** are visible in the normal product list to everyone (the approvals list is for approvers only). Is that intended? | Everyone sees them. |
| P4 | **Pack price changes** are not written to a product's history. Should they be? | Not recorded. |
| P5 | **Hide prices from storekeepers:** the spec mentions an owner switch for it. Needed now? | Not built; everyone who can read products sees prices. |

## Suppliers (Slice 2a)

| # | Question | What the build does now |
|---|---|---|
| S1 | **Who can read the supplier list?** | Only people with `manage_suppliers` or `receive_stock` (needed to pick a supplier when receiving). |
| S2 | **Can a waiting supplier be hidden?** | No. Hide is shown only for active suppliers. |
| S3 | **Completing a waiting supplier:** which fields may the approver change? | The full form, with the phone blank and required; only the phone plus changed fields are sent. |
| S4 | **Can people who only receive stock** (no `manage_suppliers`) see a supplier's full details (KRA PIN, notes) and waiting suppliers in the list? | They see everything the server returns, read-only. |
| S5 | **Neighbour-shop filter** on the list (F09 needs neighbour shops first)? | Not added now. |
| S6 | **Wording:** the message "not waiting for approval" now covers products and suppliers: "This is not waiting for approval or completion any more." OK? | Reworded. |
| S7 | **Waiting suppliers for managers:** should a manager opening a waiting supplier be offered the completion form? | Only approvers get the link to the waiting list. |
| S8 | **Supplier count** or hidden-supplier search anywhere (for example on Home)? | Left out. |
| S9 | **Somali wording** for "supplier" and the payment rules needs a native speaker. | First draft, marked for review. |
| S10 | **International supplier phones:** a Kenyan number or `+` followed by 7 to 15 digits. OK? | As described. |
| S11 | **Quick add by an approver:** people who can manage suppliers must use the full form (the quick form is refused). OK? | Refused with "use the full form". |

Server-side choices for suppliers (also not in the spec):

| # | Question | What the build does now |
|---|---|---|
| S12 | Who may edit a **waiting or hidden** supplier? | Anyone with `manage_suppliers`; editing never changes the status. |
| S13 | Adding a phone to a waiting supplier by editing: does it make it active? | No. Only "complete/approve" activates it. |
| S14 | A person with `manage_suppliers` but **not** `approve_items` adds a supplier: active or waiting? | Active (as the contract says). |
| S15 | Can an approver without `manage_suppliers` apply fixes while approving? | Yes. |
| S16 | Is the **phone unique across hidden suppliers** too? | Yes, across all statuses. |
| S17 | The similar-name check compares against **all** suppliers, including hidden and waiting. | Yes (60% shared words, same rule as products). |
| S18 | Unit of the supplier balance used to refuse hiding (a number only; balances arrive with receiving and payments). | Compared with zero only. |
| S19 | `GET /suppliers?neighbour=false` | Refused; only `neighbour=true` is accepted. |
| S20 | Should a **phone-less waiting supplier** appear in the receiving supplier picker (F04)? | Listed with the other waiting suppliers. |

## Everywhere

| # | Question |
|---|---|
| E1 | Somali translations across the whole app are first drafts, marked `TODO(translate-review)`. A Somali-speaking person should review them. |

## Receiving stock, first part (F04a, backend)

| # | Question | What the build does now |
|---|---|---|
| R1 | **A cost that is not a whole number of cents** (10,000 for 3 pieces). | The layer keeps the line total; piece costs are the whole-cent share, with the extra cents on the first pieces, so they always add up to the total. |
| R2 | **A line total of 0** (a free item is F04b). | Accepted as a known cost of 0. |
| R3 | **Due date for "pay after sold, with a latest date"** and the sale based rules. | Only cash (day of delivery) and "within a time" give a due date; the other rules give none. The date is kept even if nothing is owed. |
| R4 | **Who may enter missing costs afterwards** ("the owner, or a person the owner allowed"). | The owner, or anyone with see_cost_profit who also receives stock (so only people the owner switched on; an accountant cannot). |
| R5 | **Drawer below zero:** only cash drawers are checked. Till, Paybill, bank and safe may go below zero (their balance is not tracked before F07). | As described. |
| R6 | **A phone lost or damaged** that comes back, and a **serial number** received again. | Damaged or reserved counts as in stock (blocked); sold or lost needs owner or manager confirmation (`imei_sold_before`). Serials follow the same rules per product, with the IMEI error codes. Serial comparison is exact (case matters). |
| R7 | **A cashier sending `confirmSoldBefore: true`.** | Ignored (no 403); the sold-before refusal stays. |
| R8 | **Reusing a commandId** by another person or for another kind of command. | 409 `command_conflict`. A repeat returns the delivery as it is now (not a frozen copy of the first answer). |
| R9 | **Supplier paid in US dollars** (F04b). | Refused: 400 `supplier_currency_not_supported` (a code added to the contract). A hidden supplier is `supplier_not_found`. |
| R10 | **Merging a product that has stock history.** Stock records are append-only. | Refused with 409 `product_in_use` until sales and adjustments exist. |
| R11 | **Receiving receipts of the same IMEI at two offline devices** (F04 section 8). | The second device gets `imei_in_stock` when it syncs; no owner flag is built yet. |
| R12 | **Stock list speed:** put together in memory from stock rows and matching products. | Fine for some thousands of rows. |
| R13 | **Closing a location or hiding a product** reads stock in a separate transaction, so a delivery saved at the same instant could slip through. | Same as the earlier probes; not locked. |
| R14 | **Unknown product id in a delivery.** | 400 `product_not_found` (hidden, merged, rejected: `product_not_receivable`). |
| R15 | **Error details for the IMEI conflicts** (asked for by the app). | `imei_in_stock` sends exactly `{ imei, locationName }`; `imei_sold_before` exactly `{ imei }`. The app scans each IMEI with `GET /stock/lookup?number=` for more (status, date, delivery). |
## Receiving stock, screens (F04a, web app)

Answers to these change only the screens. IDs start with W so they do not clash with the server list.

| # | Question | What the build does now |
|---|---|---|
| W1 | **Adding a row by scanning an IMEI** (F04 §2): no endpoint maps an IMEI to a product. | The product box looks the code up as a barcode. If nothing matches and it is a valid IMEI, it says to add the phone first by name or barcode and enter its IMEIs on its row. |
| W2 | **Unknown barcode, "quick add product without leaving the sheet"** (F04 §2). | Shows "no product has this barcode" and, for people with `add_products`, a link that opens the Add product page in a new tab so the sheet is kept. |
| W3 | **Last cost from this supplier pre-filled** (F04 §2): the contracts carry no last cost. | Not built. Costs start empty. |
| W4 | **Excel row paste on the grid and Enter moves to the next cell** (F04 §2). | Not built. IMEIs can be pasted per row. Rows are added by scan or typing. |
| W5 | **Same product twice** (F04 §9.1): merge unless costs differ. | A scan or pick of a product that already has a row adds 1 to that row (also when the costs differ). Rows are never split. |
| W6 | **Very large quantity or cost, "are you sure?"** (F04 §9.3). | Not built (the contract limits apply: quantity up to 100,000). |
| W7 | **Free items, extra costs, US dollar suppliers** are F04b. | A supplier whose currency is USD is refused on the sheet with a message. People who only receive stock cannot see the currency (see Open questions above), so for them the server decides. |
| W8 | **Who may change the payment rule for one delivery?** The spec does not say. | Only people who may pay suppliers (and see costs) get the "different payment rule for this delivery only" option. Others always use the supplier's rule. |
| W9 | **Which money places may a delivery be paid from?** | The ones not hidden that are linked to the delivery's location. Changing the location resets the payment to credit. |
| W10 | **"Paid in full" while a line has no cost** (F04 §4.1: not possible). | Refused on the screen. Part paid (up to the known cost) and credit still work. A part payment equal to the whole known cost is refused with "choose Paid in full". |
| W11 | **Second IMEI** is optional (F04 §4.3). | Typed after a tab, comma or semicolon on the same line. It is checked like the first IMEI and repeated numbers (either of the two) are flagged. |
| W12 | **Serial numbers:** only a length check (64) is done on the screen. | Repeated serial numbers are not flagged by the screen (the contract only names IMEIs). The server decides. |
| W13 | **What the server sends with `imei_in_stock` and `imei_sold_before`** (the contract has no `details`). | The screen reads `details.imei`, `details.locationName` (or `details.location.name`) when present and shows "IMEI is already in stock at Shop 2". Without them it shows the plain message. Please give these errors those details. |
| W14 | **A scanned IMEI is checked against stock at once** (T8) through the stock lookup. | In stock anywhere: refused on the spot. Sold before: kept, with a note that an owner or manager must confirm. If the lookup fails (offline) the number is kept and the save checks it again. |
| W15 | **Entering missing costs:** the plan says see_cost_profit AND (owner, or a person the owner allowed). No such switch exists yet. | The form is shown to everyone with `see_cost_profit`; the server's refusal appears as "You are not allowed to do this". |
| W16 | **Supplier picker "recent ones first"** (F04 §3). | Shows the first page of the supplier list in the server's order, filtered by the typed text. A new name uses the Suppliers quick add (receiving staff only). People who can manage suppliers get a link to the full Add supplier form (the quick form is refused for them, S11). |
| W17 | **Stock screen filters:** the contract also allows a category filter. | Only a text search and a location filter are offered. |
| W18 | **Delivery list filters** (supplier, location, dates). | Not offered; newest first with "Show more". |
| W19 | **Offline use** (G6). | Saving needs a connection for now. The same `commandId` is kept for a retry of the same request. |
| W20 | **Somali text** for all of receiving and Stock. | First draft, marked `TODO(translate-review)`. Needs a native speaker. |
