# 00 — Global Rules (apply to every feature)

Collected from the founders' decisions, 2026-10-31. **If a feature spec seems to say otherwise, these rules win.**

## G1. One-person and small shops: no approvals, no PINs
- Many shops are run by **one or two people** [F].
- **Owners and approving managers never see approval steps or PIN prompts for their own actions.** Everything they do takes effect immediately.
- A shop where only the owner (or only owners and approving managers) works sees **no** approval lists, waiting labels, badges, PIN prompts or blind counts. The screens are simply shorter.
- Approvals, PINs, "waiting" status and blind counts appear **only** for actions by staff who are not approvers (cashier, storekeeper), and only once such staff exist.
- **One person with several locations:** stock moves in one step, with no "on the way" confirmation (F10).

## G2. Simple screens
- One direct flow per task; defaults instead of questions; rare options behind **More**.
- Edge cases are handled in the background, or as a single clear message.
- Basic English and Somali; no accounting words on screens.

## G3. Optional tax fields
- **KRA fields** (PINs, branch details, eTIMS codes) are **optional everywhere**. The first version works without them.
- **VAT is OFF by default.** When a shop turns it on, KRA's rules apply (F06, end section).

## G4. Never delete; keep history
- Nothing is deleted. Corrections are recorded as new entries; the original stays visible with who, when and why.
- Products, suppliers, customers, staff and locations are **hidden or switched off**, never deleted.

## G5. Correction windows
- A person can correct or cancel **their own** sale or payment **within 6 hours** without a PIN.
- After that, an owner or manager can, on the **same day**.
- **After the day is closed** (F11): no edits. Use returns, adjustments or new correcting entries.

## G6. Offline first
- Every feature works offline and syncs later. Nothing is lost.
- Conflicts found after sync (the same IMEI, the same M-Pesa code, a double payment, a duplicate product or supplier) are **flagged for the owner or manager**, never silently fixed.
- A device must connect at least every 24 hours, or it stops selling (F02).

## G7. Money and costs
- Costs are never guessed. Missing costs show as "cost missing / profit unknown" until the owner fills them in.
- Stock losses, exchange gains and losses, discounts and bad debts are shown on **separate lines**, never mixed into the cost of goods sold.
- Quantity goods are counted against the **oldest delivery first**. IMEI goods use their exact cost.

## G8. No running costs while developing
- Prefer free and on-device options. Any paid service must be optional and switched off by default (e.g. the AI invoice helper, F05).
