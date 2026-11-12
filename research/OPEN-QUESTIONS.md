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
