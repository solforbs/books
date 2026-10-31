# F10 — Moving Stock Between Locations

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01, F02 (locations), F04 (stock), F08 (counts and losses).
All founders' answers to the F10 questions were "default"; they are written in below.

## 1. Purpose
Move goods between shops and stores **without losing track of a single item**, and always know who sent what, who received it, and what went missing on the way.

## 2. Simple flows

### 2.1 Quick move (owner or manager who controls both places, or a one-person business)
**Stock → Move** → from (current location) → to → scan or pick items (IMEIs for phones) → **Move now** → done. Stock leaves one place and arrives at the other **immediately**. No "on the way" step (G1).

### 2.2 Send and confirm (when different people handle the two places)
1. **Sender:** **Stock → Move** → to → scan or pick items → **Send** → "On the way". Optional: the name of the person carrying, and a transport cost.
   **Share list** → print or WhatsApp the list (transfer number, items, quantities, IMEIs) for the person carrying.
2. **Receiver:** gets a notification **"Transfer #15 arriving"** → **Receive** → scan what arrived (or tap "All arrived") → **Confirm**.
   - All arrived → done.
   - Less arrived → the difference is flagged (§3.3).

### 2.3 Request stock (a shop asks the store)
**Stock → Request** → from (e.g. Store) → items and quantities → **Send request**. The store sees **"Request from Shop 1"** → **Send** opens a filled-in transfer (2.2) that they can change → Send.

## 3. Rules

### 3.1 Who
- **Send / receive / request:** owner, manager, storekeeper (each for the locations they are assigned to, F02).
- **Quick move (one step):** owners and managers who are assigned to **both** locations. It is also the automatic default when the business has no other staff (G1).
- The cashier role can be allowed by the owner per person.

### 3.2 "On the way"
- Goods on the way are **not sellable anywhere** and are **not in either location's count**.
- They still count in the **business's stock value**, shown as "On the way: 3 items, 285,000".
- IMEI units show the status "**On the way to Shop 2 (#15)**".
- Transfers on the way for more than 2 days (owner can change) → reminder to the owner.

### 3.3 Differences on arrival
- The receiver confirms what actually arrived:
  - **Phones and serial items:** IMEI by IMEI; a missing IMEI is named.
  - **Other goods:** quantities.
- **Less arrived:** the difference is flagged for the owner as **"Missing on the way"**, showing the sender, the carrier (if entered) and the receiver. The owner or a manager decides:
  - **Still coming** (stays on the way);
  - **Lost / stolen** (stock loss, F08);
  - **Sent by mistake / never left** (goes back to the sender's stock).
- **More arrived than sent** (or an IMEI that wasn't on the list) → flagged. It is only added after the owner or manager checks (it may belong to another transfer).
- **Wrong item arrived** (a different product) → recorded as what actually arrived. The listed item is flagged as missing.

### 3.4 Costs and prices
- Goods keep their **cost** when moved: IMEI exact cost; quantity goods move with their delivery costs, oldest first.
- **Selling prices** are the receiving location's prices (F01 per-location prices, F02 retail/wholesale default).
- **Transport cost** (optional) → an expense "Transport & delivery", linked to the transfer (as in F04), paid from the chosen money place.

### 3.5 Requests
- A request changes **nothing** in stock. It can be sent in full, partly (the rest stays requested) or declined (with an optional reason).
- The person who requested sees its status: requested → sent → received.

### 3.6 Corrections
- A transfer **not yet received** can be cancelled by the sender (or an owner or manager). The goods go back to the sender.
- A received transfer can't be edited. Fix it by moving goods back (a new transfer) or with an adjustment (F08). G4 and G5 apply.

## 4. Permissions

| Action | Owner | Manager | Cashier | Storekeeper | Accountant |
|---|---|---|---|---|---|
| Send / receive / request | ✔ | ✔ (assigned locations) | if allowed | ✔ (assigned locations) | ✖ |
| Quick move (one step) | ✔ | ✔ (assigned to both) | ✖ | ✖ | ✖ |
| Decide on "missing on the way" | ✔ | ✔ | ✖ | ✖ | ✖ |
| Cancel a transfer not received | ✔ | ✔ | ✖ | ✔ (own) | ✖ |

## 5. Offline
- Sending and receiving work offline. A transfer sent offline appears at the other location after sync.
- **Receiving before the "sent" record has synced** (the carrier arrives first): the receiver can **"Receive without transfer"** → pick the sending location → scan items. It is matched to the transfer automatically when it syncs. Mismatches are flagged.
- The same IMEI moved twice at once (two devices) → flagged after sync.

## 6. Edge cases (checklist)
1. Sending an item that is reserved, parked in a sale or borrowed from a neighbour (F06/F09) → blocked, with the reason.
2. Sending more than the location has → blocked for IMEI items; for quantity items, a warning (stock would go negative) and owner/manager only.
3. A transfer between locations with **different price lists** (wholesale store → retail shop) → prices follow the receiving location; cost is unchanged.
4. A location is being counted (F08) while goods arrive → the count handles it (count times, F08 §3.4).
5. The receiving location is closed (F02) → can't send to it.
6. The carrier loses part of the goods → "Missing on the way" → Lost (stock loss linked to the carrier's name).
7. A transfer of "cost missing" items → they stay cost missing at the new location.
8. A one-person business with 2 locations → "Move" is always one step; never shows "On the way" or Confirm (G1).

## 7. Test examples (acceptance)
- **T1 Quick move (owner):** move 10 chargers and IMEI A from Store to Shop 1 → Store −10 and −A, Shop 1 +10 and +A immediately.
- **T2 Send and confirm:** a storekeeper sends 5 IMEIs to Shop 2 → all 5 "On the way", sellable nowhere; Shop 2's manager scans 5 and confirms → in Shop 2 stock.
- **T3 Missing on the way:** sent 20 chargers, 18 confirmed → 2 flagged; the owner chooses Lost → stock loss 2 × cost, with sender, carrier and receiver named.
- **T4 Request:** Shop 1 requests 10 chargers from Store; Store sends 6 → the request shows 6 sent, 4 still requested.
- **T5 Transport cost:** a transfer with transport 500 paid in cash → expense 500 "Transport & delivery" linked to the transfer.
- **T6 Cancel:** a transfer not yet received is cancelled by the sender → the goods are back at the Store.
- **T7 Offline arrival first:** the receiver uses "Receive without transfer", scanning 5 IMEIs; the transfer syncs later → matched automatically.
- **T8 Solo owner:** a business with only the owner and 2 locations → the Move screen has no Send/Confirm, only "Move now".
