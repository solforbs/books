# 12 — Kenya Context: Traders, eTIMS, M-Pesa, Local Competitors

Added 2026-10-31 after the founders confirmed the target market. Labels as in [00-README](00-README.md), plus **[F]** = stated by the founders from their knowledge of the market (not yet independently verified).

## 1. Who we are building for (confirmed by the founders)

| Topic | What the founders told us [F] |
|---|---|
| Country | Kenya only |
| Goods | All goods; **electronics is the focus segment** |
| Shop types | Retail only; wholesale only; or **both in one business** |
| Staff | 1 to many. Wholesalers may need roles |
| Locations | Can have several |
| Current tools | **Most use paper books.** Very few use QuickBooks; those are bigger shops with a skilled employee |
| Skill level | Basic English. Most work must happen automatically |
| Payments | M-Pesa **Paybill (linked to a bank)** and **Buy Goods (Till)**, plus cash |
| Credit | Very common between suppliers → wholesalers → retailers; less common with end customers. Suppliers are paid after the goods are sold, or within an agreed period |
| Tax | Target traders are **VAT-registered**. eTIMS is wanted, but **last** in the build order |
| Electronics | IMEI tracking is a **must**. Some shops also do repairs and trade-ins |
| Neighbour sourcing | When a customer wants an item the shop doesn't have, the shop gets it from a neighbouring shop and resells it with a margin |
| Devices | Phone first, but responsive on all screen sizes |
| Languages | **English and Somali** |

**Consequence:** QuickBooks drops from a core integration to an optional "Later" export. **eTIMS (KRA) becomes the important integration** (see §2), and the competition is paper books plus local POS products (see §4).

## 2. eTIMS (KRA Electronic Tax Invoice Management System)

### 2.1 What is verified

| Fact | Evidence |
|---|---|
| All businesses must onboard eTIMS, including non-VAT-registered businesses; for buyers from small sellers there are buyer-initiated options | KRA "Learn about eTIMS" FAQ [V] |
| Solutions: eTIMS Lite (web, USSD *222#, mobile app), Online Portal, eTIMS Client, **OSCU**, **VSCU**, reverse/buyer-initiated invoicing | KRA FAQ [V] |
| Invoices can be verified by scanning the **QR code** or using the iTax invoice checker | KRA FAQ [V] |
| "Any business claiming deductions for business expenses must support them with valid electronic tax invoices" | KRA FAQ [V] |
| Finance Act 2023: from 1 Jan 2024, expenses not backed by eTIMS invoices are not deductible for income tax | EY tax alert [S], KRA FAQ [V] |
| From 2026, KRA cross-checks income-tax returns against eTIMS, withholding and customs data | Several Kenyan advisory sources, including KPMG Kenya [S]; **verify on KRA** |
| **OSCU** = for systems that are always online. **VSCU** = for bulk invoicing, not always online | KRA system-to-system page [V] |
| Software vendors must be **certified by KRA** (develop → test in sandbox → vetting → certification). A sandbox exists at `etims-sbx.kra.go.ke` | KRA system-to-system page [V] |

### 2.2 What the OSCU specification v2.0 says (read directly from KRA's PDF) [V]

The API has eight groups: device initialisation; code data; branch info (customers and users per branch); items; imported items; sales; **purchases**; **stock**.

- **Purchases:** "When a seller registers sales transaction and Invoice data to eTIMS Server, **buyer can request such data for purchase confirmation and stock adjustment purpose**." Functions: look up the purchases that suppliers have filed against our PIN, then save a purchase confirmation.
  - **This matters for invoice capture.** For suppliers who issue eTIMS invoices, the purchase data can come **straight from KRA as structured data**. No photo or text recognition is needed.
- **Stock:** the system sends stock in/out movements and the item stock master. "Every stock in/out information must have its sales Invoice information sent in advance." Stock-movement types include Import, Purchase, Return, Stock movement (branch transfer), Processing, Adjustment (incoming) and Sale, Return, Stock movement, Processing, **Discarding**, Adjustment (outgoing).
  - **This matches our event model almost one-to-one** (see [06](06-data-flows.md)). An inventory-first app is naturally eTIMS-ready.
- **Branches:** every call carries a branch ID, and the branch office requests stock coming from head office. This fits multi-location.
- **Items:** each item needs a unique `itemCd` built from country of origin, product type, packaging unit, quantity unit and a sequence number (e.g. `KE2NTBA0000012`). Items also need a KRA item classification code taken from KRA's code list.
- **Payment method codes:** Cash, Credit, Cash/Credit, Bank cheque, Card, **Mobile money**, Other.
- **Credit note reasons:** Missing quantity, Missing data, Damaged, Wasted, Raw material shortage, Refund.
- **Imported items:** customs import declarations under the trader's PIN can be fetched and converted to stock. This is relevant to electronics importers.

Practical notes from an integrator's write-up [S, to verify during certification]:
- the device key (`cmcKey`) is tied to a device serial number;
- invoice numbers must be gap-free and increasing per branch;
- signed invoices cannot be cancelled, only corrected with credit notes;
- rounding must reconcile exactly;
- **never block the checkout on a KRA API call**: queue the invoice and send it in the background.

### 2.3 What this means for the product [I]

1. **Design for eTIMS from day one, even if the integration ships last.** Concretely:
   - store a KRA item classification and unit codes per product;
   - keep a per-branch gap-free invoice sequence;
   - make corrections only by reversal (we already do this);
   - keep VAT per line;
   - record the customer's KRA PIN when given.
2. **The adoption risk is real.** VAT-registered shops must already issue eTIMS invoices today, using eTIMS Client, an ETR or another POS. Until our app integrates with eTIMS, they would enter every sale twice. That is a strong reason **not to leave eTIMS too late**. See Decision 2 in the README.
3. **We need to decide how to integrate:**
   - become a **KRA-certified third-party integrator** ourselves (cost and time unknown [U]); or
   - partner with an already-certified integrator; or
   - start with OSCU (online) versus VSCU (offline-friendly). VSCU seems to suit shops with unreliable internet [I].
4. **Expense compliance is a selling point:** the app can mark which purchases and expenses have an eTIMS invoice ("tax-deductible") and which do not.

### 2.4 Open eTIMS questions [U]
- Certification process, duration and cost for third-party vendors; what the "bio data" form requires.
- OSCU versus VSCU for a mobile-first, sometimes-offline app.
- How mixed retail and wholesale pricing appears on invoices; how VAT-exempt and zero-rated items are coded.
- The current status of the 2026 return-validation rules (confirm on KRA, not on blogs).

## 3. M-Pesa

| Fact | Evidence |
|---|---|
| Daraja **C2B** API: register a Confirmation URL (and optionally a Validation URL) for a **Till (Buy Goods) or Paybill** shortcode. M-Pesa then calls our server on every payment | Daraja integration guides [S]; Safaricom Daraja portal (to read in full) |
| Transaction type is "Pay Bill" for Paybill and "Buy Goods" for Till | [S] |
| Local POS products advertise STK Push ("enter PIN on customer phone") and automatic reconciliation | iParts, ModernPOS, Veira marketing [S] |

**Design implications [I]:**
- **MVP:** M-Pesa is a payment method. The cashier types or pastes the transaction code. The app checks the format and rejects duplicates.
- **Next:** connect the shop's Till or Paybill through Daraja C2B. Incoming payments then appear in a list, and the cashier taps the one matching the sale. This removes typing and catches fake "I've paid" SMS messages.
- **Paybill linked to a bank:** Paybill money settles to the bank, so the "M-Pesa Paybill" money place clears into the Bank money place. Till money stays in the M-Pesa wallet until withdrawn. These are two different money places.
- Daraja go-live needs the shortcode owner's approval and may need business documents [U].

## 4. Local competitors (from vendor websites only [S]; not tested)

| Product | Claims relevant to us |
|---|---|
| iParts POS | Retailers, wholesalers **and phone shops**; IMEI, warranty, split payments; Daraja STK push with automatic reconciliation; "KRA-ready ETR receipts"; offline; multi-branch transfers; KES 1,999 / 4,999 / 49,999 per month |
| Veira | Wholesalers: trade credit and debtor management, price tiers, M-Pesa Buy Goods/Paybill/Pochi, automatic eTIMS on every sale, offline. Example given: "An Eastleigh wholesaler extending credit to 80 retailers…" |
| Kings POS, ModernPOS, Mkufunzi, WIK POS, sell.ke | Each claims M-Pesa plus eTIMS plus inventory; some claim offline and multi-branch |

**Implication [I]:** "POS + M-Pesa + eTIMS" is already crowded. **We cannot win on features alone.** Possible differentiators to test with traders:
1. **Least skill needed:** invoice-photo stock-in, scan-first everything, and English and **Somali**.
2. **Credit intelligence:** what is due to suppliers *now* (goods already sold) versus later; who owes us and how overdue.
3. **Neighbour-sourcing and lending workflows,** which no product above mentions.
4. **Honest profit:** real profit (per IMEI) versus cash, which owners keeping paper books never see.

These claims need hands-on comparison (trials, demos) before we rely on them.

## 5. Trade credit (supplier → wholesaler → retailer)
- Credit from suppliers is widely used by Kenyan SMEs as short-term finance [S: University of Nairobi thesis; PEDL research on trade-credit information sharing].
- An FSD Kenya study of grocery retailers reports suppliers delivering on credit. Slow sales and slow-paying customers make it hard for traders to repay suppliers [S].
- A 2017 government study of Kenyan retail-sector prompt payment discusses consignment and credit terms [S].
- **No data found** on typical credit periods for electronics. **Must ask in interviews**: how often goods are paid "when sold" versus within N days, and how partial payments are made [U].

## Sources
- KRA eTIMS FAQ: https://www.kra.go.ke/helping-tax-payers/faqs/learn-about-etims
- KRA system-to-system integration: https://www.kra.go.ke/business/etims-electronic-tax-invoice-management-system/learn-about-etims/etims-system-to-system-integration
- KRA OSCU Specification v2.0 (PDF, read directly): https://www.kra.go.ke/images/publications/OSCU_Specification_Document_v2.0.pdf
- KRA OSCU/VSCU sign-up guide: https://www.kra.go.ke/images/publications/OSCU_VSCU_Step-by-Step_Guide-on-how-to-sign-up.pdf
- eTIMS sandbox: https://etims-sbx.kra.go.ke/
- EY on Finance Act 2023: https://www.ey.com/en_gl/technical/tax-alerts/kenya-enacts-tax-changes-under-finance-act--2023
- KPMG Kenya on eTIMS (2026): https://assets.kpmg.com/content/dam/kpmgsites/ke/pdf/thought_leaderships/tax/2026/eTIMS.pdf.coredownload.inline.pdf
- Integrator notes (secondary): https://www.codewithkarani.com/blog/kra-etims-oscu-api-integration-guide
- Daraja C2B guide (secondary): https://dev.to/msnmongare/m-pesa-daraja-api-c2b-integration-guide-djn
- iParts POS: https://iparts.co.ke/ · Veira: https://www.veirahq.com/solutions/pos-software-for-wholesalers/ · Kings POS: https://kingscreationpos.co.ke/ · ModernPOS: https://modernagepos.com/ · Mkufunzi: https://pos.mkufunzi.com/ · WIK: https://wiktechnologies.com/wik-pos · sell.ke: https://sell.ke/inventory-management-kenya
- Trade credit: https://pedl.cepr.org/content/trade-credit-information-sharing-among-smes-kenya-1 ; https://www.fsdkenya.org/wp-content/uploads/2021/04/Challenges-facing-women-and-youth-grocery-retail-traders-in-Kenya_Synthesis-presentation_.pdf ; https://www.tralac.org/documents/resources/by-country/kenya/581-study-on-kenya-retail-trade-sector-prompt-payment-june-2017/file.html ; https://erepository.uonbi.ac.ke/server/api/core/bitstreams/00420cfa-30f4-47b9-84e3-c533a8abdd2a/content
