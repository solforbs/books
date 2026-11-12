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
