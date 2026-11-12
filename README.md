# Books

Inventory-first shop management for **Kenyan traders** (all kinds of goods, with a focus on electronics). The shop owner records what comes in, what goes out and who owes what; the accounting happens automatically in the background. Simple screens, English and Somali, works on phones, tablets and computers.

## What works today

| Area | What you can do |
|---|---|
| **Accounts** | Create a business, log in with phone or email, recovery codes, several businesses per person |
| **Locations and staff** | Shops and stores, M-Pesa Till / Paybill / bank / safe, staff with roles and per-person permissions |
| **Products** | Categories, products (typed names or built from brand, model, storage, colour, condition), create several at once, IMEI / serial / quantity tracking, pack sizes, barcodes, duplicate checks, approvals |
| **Suppliers** | Supplier list with payment rules (cash, within a time, pay as you sell, after all sold, with a latest date), US dollar suppliers |

The roadmap and every approved feature spec are in [`research/`](research/).

## Stack

- **Web:** React 19 + Vite PWA (`apps/web`), Tailwind, i18next (English and Somali)
- **API:** NestJS on Fastify (`apps/api`), PostgreSQL with Drizzle ORM and row-level security
- **Shared:** Zod contracts and rules used by both sides (`packages/shared`)
- TypeScript everywhere, pnpm workspaces, Node 22 or newer

## Run it on your computer

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts everything: an embedded PostgreSQL (no Docker, no install), the API and the web app at http://localhost:5173. The first start takes a couple of minutes.

Local settings live in `apps/api/.env` (not committed). On a new machine copy `apps/api/.env.example` to `apps/api/.env` and replace the secrets with random values.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The server tests start a real PostgreSQL and hash passwords on purpose, so the full run takes 15 to 20 minutes. They are capped at 2 parallel workers; on a machine with few cores avoid running other heavy jobs at the same time.

## Project layout

```
apps/api        NestJS API: one folder per module (identity, locations, catalog, suppliers, ...)
apps/web        React app: one folder per feature under src/features
packages/shared Contracts, money, IMEI, phone and barcode helpers
deploy          Docker Compose for the VPS (the app runs in Docker only in production)
research        Research, approved feature specs, architecture and open questions
```

## House rules (short)

- One responsibility per file (lint fails above 300 lines).
- Money is stored as whole cents, never as decimals.
- Every business's data is separated in the code and again by the database.
- Nothing is deleted: changes are recorded and corrections are new entries.
- No hard-coded screen text: everything goes through i18next.
- Fonts: Space Grotesk for headings, Inter for body text. No emojis.

The full list is in [`CLAUDE.md`](CLAUDE.md).

## Deploying

See [`deploy/README.md`](deploy/README.md) (Docker Compose behind the VPS's web server, PostgreSQL with restricted roles, backups).

## Documents worth reading first

- [`research/features/00-global-rules.md`](research/features/00-global-rules.md): rules that apply to every feature
- [`research/architecture/ARCH-01-architecture.md`](research/architecture/ARCH-01-architecture.md): architecture
- [`research/architecture/ARCH-02-inventory-ledger.md`](research/architecture/ARCH-02-inventory-ledger.md): stock and money foundation (proposal)
- [`research/OPEN-QUESTIONS.md`](research/OPEN-QUESTIONS.md): things the specs do not answer yet
