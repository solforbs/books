# 09 — Risks, Unresolved Questions & Assumptions

## Key risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | QBO API, or the App Partner terms, are not available or affordable in our launch country | Medium [U] | High | Sandbox and trial-company test first; the CSV export path makes the MVP independent of QBO |
| R2 | Accountants reject summary journals or clearing accounts | Medium [U] | High | Interview accountants early; offer per-customer A/R / per-vendor A/P as an option (Decision 3) |
| R3 | The shop or another integration also posts sales to QBO → double revenue | High [I] | High | Onboarding checklist; detect existing sales-receipt feeds via a one-time read; nightly reconciliation |
| R4 | Shops won't scan IMEIs consistently (rush hours, damaged labels) | Medium [U] | High | Make scanning faster than typing; allow "pick from list"; daily IMEI count highlights gaps |
| R5 | Unreliable internet at the counter | Medium–High [U] | High | Offline-first sales (SAL-7) could become Must; validate with field research |
| R6 | Staff theft via refunds, discounts or write-offs | Medium [I] | Medium | Permissions, PINs, reasons, immutable log, an exception report for the owner |
| R7 | Wrong costs at receiving corrupt profit | High [I] | Medium | Last-cost prefill; a margin sanity warning (e.g. sell price < cost); editable with an impact preview |
| R8 | Tax/VAT rules at POS (e.g. electronic tax invoicing in some countries) | Unknown [U] | High | Country research before build; could be a legal must |
| R9 | Over-building (an ERP creeping in) | Medium | Medium | Strict MVP list; "Later" bucket requires customer evidence |
| R10 | Intuit changes API or pricing | Low–Medium | Medium | Thin sync layer; export fallback |

## Unresolved questions (need answers before or during design)

**Market and customers**
1. Which country/countries? Which currency, tax regime and mobile-money providers?
2. Do target shops actually use QBO, and which edition and plan? Who operates it: the owner or an external accountant?
3. How common are credit sales and supplier credit? What terms are typical?
4. What share of sales are serialised devices versus accessories? How many SKUs?
5. Do shops sell wholesale to other dealers? Do they do trade-ins or repairs?
6. What hardware is at the counter: phone, tablet, PC, printer, scanner?
7. How reliable is connectivity?

**Accounting**
8. Will accountants accept daily summary JEs with clearing accounts?
9. Are there legal requirements for receipts or invoices (numbering, tax IDs, e-invoicing)?
10. Should costing be moving average for accessories (our recommendation), or must it match FIFO for local reporting rules? [U]

**QuickBooks**
11. Can the global edition be tested via the Intuit sandbox? If not, can we use a trial company?
12. Does JournalEntry posting to A/R or A/P require a Name in the target locale? (We assume yes [I].)
13. What are the App Partner Program status and fees for a developer outside the US?
14. What does production-app approval involve (security questionnaire, review time)?

## Assumptions we are making (to be validated)

| # | Assumption | Validation |
|---|---|---|
| A1 | Single-location shops are the best first segment | Interviews (≥ 10 shops) |
| A2 | IMEI tracking is a must for phone shops | Interviews plus observation |
| A3 | Owners care more about "profit, cash, debts, stock" than accounting reports | Interviews |
| A4 | A shop can stop QBO inventory tracking without harming its accountant | Accountant interviews |
| A5 | Moving average is acceptable for accessories | Accountant confirmation per country |
| A6 | Mobile money can be treated as a manual payment method in the MVP | Shop observation |
| A7 | Owners will do a "close day" cash count | Pilot |
| A8 | No product we studied already serves this niche simply enough | Wider scan of local/regional products, which we have not done yet [U] |

## Missing evidence (gaps in this research)
- No hands-on trials or demos of any product. All workflow detail comes from documentation.
- Several Intuit developer pages were only seen as search extracts [V-s].
- App Partner Program pricing comes from secondary sources.
- No local or regional competitors were studied (e.g. African or Asian phone-shop POS products).
- No customer interviews or behavioural data.

## Kenya update (2026-10-31)

### Additional risks
| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R11 | VAT-registered shops have to double-enter sales until eTIMS is integrated | High | High | Start KRA certification early, or partner with a certified integrator; eTIMS in release 2 at the latest |
| R12 | KRA certification takes a long time or has requirements we can't meet | Unknown [U] | High | Apply early; read the OSCU/VSCU specs and the bio-data requirements; keep the partner route open |
| R13 | Crowded local market (iParts, Veira, Kings, ModernPOS…) | High [S] | High | Hands-on trials of 3 local products; differentiate on least skill needed, Somali, credit and neighbour workflows; validate willingness to pay versus their KES ~2,000/month pricing |
| R14 | Invoice-photo extraction is inaccurate on handwritten or carbon-copy invoices | Medium [U] | Medium | Accuracy gate with real invoices; manual and scan fallback |
| R15 | Wrong accounting treatment of "pay when sold" stock (consignment versus credit) | Medium | Medium | Per-supplier setting; accountant validation |
| R16 | Somali translation quality / terminology | Medium | Medium | Professional translation plus review by Somali-speaking traders |
| R17 | Data protection (customer phone numbers, IDs for trade-ins, invoice images) under Kenya's Data Protection Act 2019 | Unknown [U] | Medium | Legal check; possible registration with the ODPC [U] |
| R18 | Trust: owners fear that a digital record exposes them to tax enforcement | Plausible [I] | High | Position eTIMS compliance as removing informal costs and disputes; owner controls what is shared; legal advice on messaging |

### Additional questions
15. "Pay when sold": are those goods legally the supplier's until sold (consignment), or ours on credit? Typical credit periods?
16. Neighbour sourcing: how is the price agreed; is it paid the same day; does the neighbour get anything in writing? Does lending (B4) also happen?
17. What do supplier invoices look like: eTIMS-printed, computer-printed, or handwritten invoice books? Collect samples.
18. Which eTIMS tool do target shops use today (eTIMS Client, ETR, a POS)? What would make them switch?
19. Paybill versus Till usage; who in the shop sees M-Pesa messages?
20. How many target shops have more than one location; how is stock moved today?
21. Which local POS products do they know or use, and why did they stop?
