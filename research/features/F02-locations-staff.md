# F02 — Locations & Staff

Status: **APPROVED by founders** · 2026-10-31
**Global rules apply:** see [00-global-rules.md](00-global-rules.md). One-person shops see no approvals or PINs, KRA and VAT are optional, nothing is deleted, and everything works offline.
Depends on: F01 Products (approved).
Design rule from the founders: **as simple as possible; direct flows, no confusion; edge cases handled in the background.**

## 1. Purpose
Set up **where** the business works (shops, stores) and **who** works there, so that every later action records *who did it, where, and on which device*. The owner controls who can sell and steal-proofs the business by choosing which phones are allowed to sell.

## 2. Simple flows (what users see)

### 2.1 First-time setup (owner, about 2 minutes)
1. Enter phone number → SMS code → set a 4-digit PIN.
2. Business name. KRA PIN is **optional**: the app works fully without it, and a gentle reminder appears only once eTIMS is available.
3. Choose language: English / Somali.
4. "Where do you sell?" → name of the first shop (e.g. "Luthuli Shop 1"). Done. The cash drawer is created automatically.
5. Optional now, or later from Settings: add more locations, add M-Pesa numbers, add staff.

### 2.2 Add a location (owner)
**Settings → Locations → +** → name → type **Shop** or **Store** → Save.
Everything else has defaults:
- shops sell, stores don't (switchable);
- the price list is Retail (switchable to Wholesale);
- a cash drawer is created automatically for each selling location.

### 2.3 Add a staff member (owner or allowed manager)
**Settings → Staff → +** → name → phone number → role → which locations → Save.
- The person gets an SMS invite.
- On first login they set their own 4-digit PIN and pick a language.

### 2.4 Daily login
- **Own phone:** open the app → PIN.
- **Shared shop phone or tablet:** tap your name → PIN. The app locks itself after a few minutes without use, so the next person logs in as themselves.

### 2.5 Lost phone / staff leaves (owner)
- **Settings → Staff → [name] → Switch off.**
- **Settings → Devices → [device] → Remove.** The device is logged out as soon as it is online.

## 3. Locations

| Item | Rule |
|---|---|
| Types | **Shop** (sells by default) and **Store** (holds stock; selling off by default, the owner can switch it on) |
| Price list | Each location has a default price list: **Retail** or **Wholesale**. The cashier can still switch per sale, if allowed (F06) |
| Cash drawer | **Each selling location has its own cash drawer**, always separate |
| M-Pesa and bank | Added once for the business: Till (Buy Goods), Paybill, bank account. Each one is linked to **one or several locations**, so it can be **shared or separate** |
| KRA | Business KRA PIN at setup (skip allowed, with a reminder). **KRA branch details per location are left blank and not assumed.** They will be filled in during the eTIMS feature, once certification shows how branches must be registered |
| Closing a location | Only allowed when it holds **no stock** and its **cash drawer is zero**. Closed locations are hidden, never deleted; their history stays |
| Renaming | Allowed; history shows the new name |

## 4. Staff, roles and permissions

### 4.1 Roles

| Role | In simple words |
|---|---|
| **Owner** | Everything, all locations. A business can have several owners |
| **Manager** | Runs their assigned locations. Can approve products and set prices if the owner allows |
| **Cashier** | Sells **and** takes payments at their locations. The founders confirmed that "staff who sells" is this same role, so there is no separate sales-staff role |
| **Storekeeper** | Receives, moves and counts stock |
| **Accountant** | Can view and export; cannot change anything |

### 4.2 Per-person switches (optional; hidden behind "More")
The owner can switch individual permissions on or off for a person, e.g. "can give discounts", "can see cost and profit", "can approve products", "can do refunds". The role sets the defaults, so most owners never touch the switches.

### 4.3 Rules
- **There is always at least one owner.** The last owner cannot be removed or switched off.
- One person can work in **several locations**. They pick the location when logging in, or switch it from the top bar.
- Each person chooses their **own language** for their screens. **Receipts use the location's language setting** (confirmed).
- A switched-off person cannot log in anywhere. **All their past work stays** under their name. They can be switched back on.
- A phone number belongs to one person in the business. A new worker re-using a former worker's phone number gets a **new** person record, so history is never mixed.

## 5. Devices and anti-theft

**Owner setting per location:** "**Who can sell here?**"
- **Any staff phone** (default): staff may sell from their own phones.
- **Only approved shop devices**: selling, receiving and payments for this location work only on devices the owner has approved (e.g. the shop tablet). Staff phones can still be used to *view*, if allowed.

**Approving devices:** a new device that tries to sell at a locked location shows "Waiting for owner approval". The owner approves or rejects it from a notification or from **Settings → Devices**.

**Device list:** shows each device, who last used it, its location and when it was last online. **Remove** logs it out.

**Offline safety:**
- A device must **connect at least once every 24 hours** (owner can change this). Otherwise it stops selling until it connects.
- So a removed or stolen phone that stays offline can only keep working for a limited time.
- Sales made offline are never lost; they sync when the device connects.

**PIN safety:**
- 5 wrong PINs → that person is locked out for 5 minutes on that device.
- The owner or manager can reset a staff PIN.
- An owner logging in on a **new** device always needs an SMS code.

## 6. Activity tracking
- Every action records **person, location, device and time**.
- **Sales per staff member** (count and value) in reports (F12).
- A **login history** per person and device, visible to the owner.
- **Commission: not in the first version.** Staff are on salary today (salaries are recorded as expenses in F11). Commission is a *Later* feature for the few shops that use it.

## 7. Offline and sync
- Location, staff and device changes are made online when possible. If made offline, they sync later.
- If a person is switched off while their device is offline, they can still log in on that device until it next connects or the 24-hour limit is reached. **This is the known gap.** The 24-hour rule limits it.

## 8. Edge cases (checklist)
1. The owner tries to remove themselves as the last owner → blocked: "Add another owner first."
2. Staff assigned to no location → cannot be saved.
3. A location is closed while staff are assigned → they are unassigned. If it was their only location, the owner is asked to assign another one.
4. Closing a location with stock or cash → blocked, with "Move 23 items" or "Cash drawer has 4,500" shown.
5. A location is switched to "Only approved devices" while staff are mid-sale on their phones → the sale they are on can finish; new sales are blocked.
6. A shared tablet is left logged in → auto-lock after X minutes (default 3); the next sale needs a PIN.
7. Two people with the same name → the list shows them with their phone numbers.
8. A phone number already used by an active staff member → blocked.
9. An SMS invite isn't received → resend, or show a one-time code the owner reads out.
10. A stolen phone is removed by the owner while offline → logged out on its next connection, or blocked after 24 h offline.
11. A Till number is linked to two locations, and a payment can't tell which location it was for → the cashier's sale decides the location (when M-Pesa matching arrives in F06/F07).
12. A KRA PIN in the wrong format → warning (format: letter, 9 digits, letter, e.g. A123456789B [S, confirm with KRA]).
13. A manager tries to give themselves more permissions → blocked; only owners change roles and switches.

## 9. Test examples (acceptance)
- **T1 Setup:** a new owner completes setup with phone, PIN, business name and one shop → the shop and its cash drawer exist; KRA PIN skipped → a reminder shows on the home screen.
- **T2 Store vs shop:** add a Store → selling is off; switch it on → selling is allowed there.
- **T3 Shared M-Pesa:** a Till linked to Shop 1 and Shop 2 → both offer it as a payment method; a bank account linked only to Shop 1 → only Shop 1 offers it.
- **T4 Device lock:** Shop 1 is set to "Only approved devices" → a cashier's own phone can't start a sale there; the shop tablet (approved) can.
- **T5 New device approval:** an unknown tablet tries to sell at Shop 1 → "Waiting for owner approval"; the owner approves → it can sell.
- **T6 Lost phone:** the owner removes a device → it logs out on its next connection. If it stays offline for 24 h, it stops selling.
- **T7 Leaver:** a cashier is switched off → they can't log in; last month's sales still show their name.
- **T8 Last owner:** the only owner tries to switch themselves off → blocked.
- **T9 PIN lockout:** 5 wrong PINs → locked 5 minutes; the owner resets the PIN → the person can log in with the new PIN.
- **T10 Multi-location staff:** a manager assigned to Shop 1 and Store → can switch between them; can't see Shop 2.

## 10. Founders' answers
1. "Staff who sells" = **the Cashier role** (sells and takes money).
2. **No commission** in the first version. Staff get a salary; some shops may want commission later.
3. Auto-lock after **3 minutes** and the **24-hour** offline limit: **confirmed** as defaults (the owner can change them).
4. Receipt language **follows the location's setting**.

## Approvals only when they are needed (applies to F01, F02, F03 and every later feature)
- **A shop run by the owner alone, or only by owners and approving managers, never sees an approval step.** Everything they add is active immediately, and no "waiting" lists or badges appear.
- Approval steps appear only once the business has staff who are **not** approvers (e.g. a cashier or storekeeper). They then apply only to what those staff add.
- Many shops are run by one or two people [F], so this keeps the app simple for them.

## Business details for documents (added with F12)
**Settings → Business details:** logo, business name, address/market (e.g. "Luthuli Avenue, Shop 12"), phone, email, KRA PIN (optional, G3), and a footer note. All are optional except the name. Every document uses them: receipts, quotations, purchase orders, statements and PDF summaries. Per-location address and phone are optional.

## Login change (founders, with ARCH-01 §8)
Wherever this spec mentions **SMS codes or SMS invites**, the approved design is:
- **phone number or email + strong password** for everyone;
- the owner creates staff accounts with a **temporary password**, which must be changed at first login;
- recovery by codes, email or another owner;
- device approval and the 24-hour offline rule stay as specified.
