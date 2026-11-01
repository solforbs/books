# Books — engineering rules (read before writing code)

Inventory-first shop app for Kenyan traders. Product specs live in `research/features/` (F01–F12 approved; `00-global-rules.md` overrides everything). Architecture is in `research/architecture/ARCH-01-architecture.md`.

## Stack

- pnpm monorepo: `apps/api` (NestJS on Fastify, PostgreSQL via Drizzle ORM), `apps/web` (React + Vite PWA), `packages/shared` (Zod contracts, money, IMEI, phone, password policy).
- TypeScript strict everywhere. Node >= 22.

## House rules

1. **One responsibility per file.** Target < 200 lines; ESLint fails above 300.
2. **API layering per module:** `api/` (controllers + DTO wiring, no logic) → `application/` (one use case per file) → `domain/` (pure rules, no I/O) → `infrastructure/` (Mongoose schemas, repositories). Modules never touch another module's collections; they call its exported service.
3. **Contracts first:** request/response shapes live in `packages/shared/src/contracts`. Both apps import them; never duplicate shapes.
4. **Money is integer cents** (`Cents` from `@books/shared`). Never floats.
5. **Multi-tenant:** every tenant-owned document has `tenantId`; every query goes through a repository that requires a `tenantId`. Write a test proving cross-tenant access fails.
6. **Nothing is deleted** (G4): use status fields and reversing entries.
7. **Idempotent writes:** state-changing commands from devices carry a client `commandId`.
8. **No hard-coded UI text:** every string goes through i18next (`en` and `so`).
9. **Errors:** API errors always use `{ error: { code, message, details? } }` with stable codes.
10. **Security:** validate all input with Zod at the boundary; never log passwords, tokens or full phone numbers; secrets only via env vars (`.env.example` documents them).
11. **Tests:** every feature maps its spec T-cases to automated tests. `pnpm lint && pnpm typecheck && pnpm test` must pass before a commit.
12. **Visual style (G9):** Space Grotesk for titles/headings, Inter for body/labels (self-hosted); **no emojis** anywhere. Use icons (lucide-react) or words.
13. Match surrounding code style; small, well-named functions; comments explain _why_, not _what_.

## Commands

- `pnpm install`, then **`pnpm dev`** starts everything locally (no Docker): database (port 27018, data kept in `apps/api/.data/`), API (3000) and web app (http://localhost:5173). The first start is slow (it downloads MongoDB once and compiles).
- Local settings live in `apps/api/.env` (not committed; copy `apps/api/.env.example` on a new machine). Docker is only used for the VPS (`deploy/`).
- `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build`
