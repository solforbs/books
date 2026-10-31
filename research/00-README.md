# Inventory-First System for Kenyan Traders — Research Pack

Research date: 2026-10-31. No code, no stack choice. Everything here is meant to inform an MVP approval decision.

> **Update (2026-10-31, after the founders' answers):** the market is **Kenya**, **all goods** with **electronics as the focus**.
> - Shops can be retail, wholesale or both, with several locations and 1+ staff.
> - Most keep **paper books**; very few use QuickBooks.
> - Payments are M-Pesa Paybill (bank-linked) and Buy Goods (Till), plus cash.
> - Credit is very common between suppliers, wholesalers and retailers.
> - Shops are VAT-registered, so **eTIMS** is needed. IMEI tracking is a must.
> - The UI must be in **English and Somali**.
>
> Kenya-specific research is in [12](12-kenya-context.md), and the new workflows (invoice-photo stock-in, neighbour sourcing, credit intelligence, wholesale units, multi-location) are in [13](13-new-workflows.md). Docs 01–11 were written before this update. **Where they conflict, 12 and 13 win.** The main changes:
> - QuickBooks moves from a core integration to an optional "Later" export.
> - eTIMS becomes the key integration.
> - Multi-location, wholesale and supplier credit move into scope.

## How to read the evidence labels

| Label | Meaning |
|---|---|
| **[V]** | Verified from a primary source (official vendor or government documentation) that we fetched and read |
| **[V-s]** | From an official page, but only seen as a search extract (JavaScript-rendered page). Re-check before relying on it |
| **[S]** | Secondary source (blog, reseller, integrator, forum, vendor marketing). Plausible, not authoritative |
| **[F]** | Stated by the founders from market knowledge; not yet independently verified |
| **[I]** | Our inference or design reasoning |
| **[U]** | Unknown; needs verification |

**About REA:** no REA tool was used. The repo the founders shared (`AIshihzong/awesome-reverse-engineer-anything`) is a list of links; the tool itself is `morluto/rea`. For SaaS products it would only help by analysing traffic from our *own* authorised sandbox or trial sessions. See [11](11-next-steps.md).

## Documents

| # | Document |
|---|---|
| 01 | [Executive summary & problem definition](01-executive-summary.md) *(pre-update; see the banner above)* |
| 02 | [Competitor workflow comparison: global products](02-competitor-workflows.md) |
| 03 | [Business & transaction model](03-business-transaction-model.md) |
| 04 | [User journeys](04-user-journeys.md) |
| 05 | [Functional requirements (Must / Should / Later)](05-requirements.md) |
| 06 | [Inventory & accounting data-flow diagrams](06-data-flows.md) |
| 07 | [QuickBooks integration feasibility](07-quickbooks-feasibility.md) *(now lower priority)* |
| 08 | [MVP scope & exclusions](08-mvp-scope.md) |
| 09 | [Risks, questions, assumptions](09-risks-questions-assumptions.md) |
| 10 | [Acceptance criteria & test scenarios](10-acceptance-criteria.md) |
| 11 | [Next-step plan](11-next-steps.md) |
| **12** | [**Kenya context: eTIMS, M-Pesa, local competitors, trade credit**](12-kenya-context.md) |
| **13** | [**New workflows: invoice photo, neighbour sourcing, credit, wholesale, multi-location, languages**](13-new-workflows.md) |

## Founders' answers (2026-10-31)

| Decision | Answer |
|---|---|
| 1. eTIMS | **KRA certification has been applied for and is in progress.** Build the features first, keeping the data model eTIMS-ready (KE-7) |
| 2. First trader segment | *Not yet answered* |
| 3. Invoice photo | **Invoice upload and manual input both ship first** |
| 4. "Pay when sold" goods | **The goods are ours; we only owe the supplier money.** Terms look like "within 3 months" or "after all the goods are sold". Partial payments reduce the balance |
| 5. Multi-location + offline | **In the first version** |
| VAT | **Optional, off by default** (most shops don't deal with VAT). When a shop turns it on, KRA's rules apply. This replaces the earlier "shops are VAT-registered" assumption in docs 12–13 |
| Feature specs | One feature at a time in [features/](features/) |

**Working method:** build **one small feature at a time**, cover every edge case, and keep asking questions until the requirement is clear. The feature-by-feature specs will live in `features/`.

## The five decisions the founders must make before approving the MVP (revised)

1. **When and how do we do eTIMS?**
   - **Why it matters:** VAT-registered shops must already issue eTIMS invoices. Until we integrate, they would record every sale twice, in our app and in their eTIMS tool. That is a serious adoption barrier.
   - **Options:** (a) eTIMS in the MVP; (b) the MVP without eTIMS, targeting shops willing to double-enter during a pilot, with eTIMS in release 2.
   - **Route:** become a KRA-certified integrator ourselves, or partner with one. Choose OSCU (always online) or VSCU (bulk, offline-friendly).
   - **Recommendation:** design for eTIMS from day one; **start KRA certification in parallel with the MVP build**; ship it in release 2 at the latest.
2. **Which trader do we serve first?** The app supports all goods, but the launch customer decides the defaults and the sales pitch.
   - **Options:** (a) electronics/phone *retail* shops; (b) electronics *wholesalers* that sell to retailers on credit; (c) both.
   - **Recommendation:** (a) plus their wholesale suppliers as a second wave. Retail phone shops feel the IMEI and neighbour-sourcing pain most, and the app's workflows are simplest there.
3. **Is invoice-photo stock-in in the MVP, or only after an accuracy test?**
   - **Recommendation:** collect 100–200 real supplier invoices during discovery and measure extraction accuracy. Ship it only if most invoices need ≤ 2 corrections. Otherwise ship scan and manual entry first.
   - eTIMS purchase fetch replaces photos for eTIMS-backed suppliers once eTIMS is connected.
4. **How is "pay when sold" supplier stock treated?** Either it is *ours on credit* (in our stock value, owed to the supplier) or it is the *supplier's consignment* (not ours until sold).
   - **Why it matters:** this changes the stock value, the debts and the profit timing, and accountants must agree with the choice.
   - **Recommendation:** default to "ours on credit", with a per-supplier consignment option. Validate with traders and an accountant.
5. **What goes into MVP v1: multi-location, offline and wholesale?** The founders said shops can have several locations, and connectivity is unreliable [F/U].
   - **Recommendation:** v1 is offline-tolerant selling, one business with multiple locations and stock transfers, and retail plus wholesale prices with pack units.
   - Defer: repairs, the full trade-in workflow and QuickBooks sync.
   - **Accept the bigger scope only if** the build timeline allows it. Otherwise ship single-location first.

Also note, as a risk rather than a decision: the "POS + M-Pesa + eTIMS" market in Kenya is already crowded (iParts, Veira, Kings, ModernPOS and others; [12 §4](12-kenya-context.md)). The differentiation has to come from **least skill needed, Somali language, credit intelligence, neighbour sourcing and honest profit**, and must be tested against those products hands-on.
