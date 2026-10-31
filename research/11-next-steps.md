# 11 — Recommended Next-Step Plan

No stack is selected yet. Steps 1–3 must finish before choosing one.

## Step 1 — Decide and validate (2–3 weeks)
1. **Founders decide on the five decisions** in [00-README](00-README.md), at least provisionally.
2. **Customer discovery:** 10–15 shop visits and 5 accountant interviews, using the question list in [09](09-risks-questions-assumptions.md). Observe a real receiving session and a real day close. Record:
   - the QBO edition/plan in use;
   - volumes (sales/day, SKUs, % serialised);
   - credit practices;
   - counter hardware;
   - connectivity.
3. **Local competitor scan:** the products shops in the launch country actually use. This research has not covered regional players yet.

## Step 2 — De-risk QuickBooks (1–2 weeks, in parallel)
1. Register an Intuit developer account and create sandbox companies. Check whether a **global-edition** sandbox is possible; if not, use a real QBO trial company in the launch country (authorised, our own account).
2. In the sandbox, prove the following:
   - OAuth connection;
   - reading the chart of accounts;
   - a JournalEntry create with `requestid` and a replay;
   - JE update with SyncToken;
   - JE lines to A/R or A/P with and without a Name;
   - a CDC read;
   - behaviour when the QBO closing date is set.
3. Confirm on Intuit's official pages the App Partner Program status and terms for our country, and what production-app approval requires.
4. **Where REA could add value (legally):** documenting the request and response shapes and edge-case errors observed in *our own* sandbox and trial companies; and analysing publicly accessible demo/trial flows of Loyverse, Square and Lightspeed to time and count the steps in their receiving, sale and return workflows. No bypassing of authentication or licence terms.

## Step 3 — Design (2–3 weeks)
1. Low-fidelity prototypes of J1–J8 ([04](04-user-journeys.md)) on a phone-sized screen.
2. **Usability tests** with 5 owners and 5 cashiers. Measure the time and taps for: receive 20 IMEIs, split-tender sale, credit sale, return, close day, answering the 10 questions.
3. Validate the costing method and account mapping with 2 accountants.
4. Finalise MVP scope and requirement priorities. Update [05](05-requirements.md) and [08](08-mvp-scope.md).

## Step 4 — Technical architecture (1 week), only now choose the stack
Derive the stack from the validated constraints:
- offline-first or not;
- device types;
- printer/scanner support;
- data residency;
- the QBO integration approach;
- an event-log + projections model ([06](06-data-flows.md)).

Write ADRs for: the event model, costing, sync design, money representation, and permissions.

## Step 5 — Build in vertical slices (with acceptance tests from [10](10-acceptance-criteria.md) written first)
1. Catalogue + import + receiving (AC-1…4).
2. Sales + payments + receipts (AC-5, 6).
3. Returns + write-offs + counts (AC-7…10).
4. Money, expenses, close day, dashboard, bridge (AC-11…13).
5. Journal integrity, permissions, export (AC-14…16).
6. QBO sync (AC-17), if in scope; otherwise release 2.

## Step 6 — Pilot (6–8 weeks)
- 3–5 shops, ideally with their accountants.
- Weekly check of the success metrics in [08](08-mvp-scope.md).
- At month end, reconcile with the accountant line by line.
- Go/no-go for a wider launch based on the reconciliation results and daily active use.

## Kenya update (2026-10-31): changes to the plan
- **Step 1 discovery:**
  - visit Kenyan electronics retailers and wholesalers, e.g. the Nairobi CBD and Eastleigh electronics markets [I, to choose];
  - collect **100–200 real supplier invoice photos** (with permission) for the extraction accuracy test;
  - ask the new questions 15–21 in [09](09-risks-questions-assumptions.md);
  - include Somali-speaking traders.
- **Step 2 de-risk, replacing most of the QuickBooks work:**
  - (a) **eTIMS:** read the OSCU and VSCU specs in full, register on the KRA eTIMS sandbox, start the third-party-integrator certification enquiry, and evaluate certified-integrator partners;
  - (b) **M-Pesa:** Daraja sandbox test of C2B for a Till and a Paybill;
  - (c) **Local competitors:** free trials or demos of iParts, Veira and one more. Time the receiving, credit-sale and neighbour-sourcing workflows. REA could help here only on traffic from our own authorised trial sessions, and only if their terms allow it;
  - (d) **Invoice extraction:** measure accuracy on the collected invoices.
- **QuickBooks sandbox work** moves to Later.
- **Step 3 design:** prototype J1–J8 plus W-A (invoice photo), W-B (neighbour), W-C (credit screens) in English and Somali.
