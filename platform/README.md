# NordStern — Platform (Control Plane)

The multi-tenant SaaS for NordStern **Anchor OS** — where organizations register,
manage members, and (later) provision Stellar anchors. This is the **Control Plane**;
`../anchor-service/` is the **Data Plane** (the anchor provisioning engine it will
call in a later phase).

## Layout
- `api/` — TypeScript + Express (clean-layered) + Drizzle ORM + PostgreSQL.
- `console/` — Next.js 16 console (shadcn/ui, RHF+Zod, TanStack Query). *(added in a later phase)*

## Decisions (DL-010)
- **Language: TypeScript** (Express), not FastAPI — chosen to stay one language and
  reuse patterns from the existing control-plane. Supersedes the FastAPI proposal.
- **ORM: Drizzle + drizzle-kit** migrations (SQL-first, fully typed) in place of
  SQLAlchemy/Alembic. **Validation: Zod** in place of Pydantic.
- **Auth: access + rotating refresh tokens in httpOnly cookies + a sessions table.**
- **Multi-tenancy: shared DB, `organization_id` on every tenant-owned row,** enforced
  by a central tenant guard + scoped repositories.
- **Home: new top-level `platform/`**, separate from `anchor-service/` (3-plane split).

## Phase status
- Phase 1 — Analysis · Phase 2 — Architecture · Phase 3 — Database
- Phase 4 — Backend (auth + orgs + members + invitations + api-keys + audit, layered
  Express: config → repositories → services → controllers; cookie/refresh/session auth;
  tenant guard; Resend email w/ console fallback; verified end-to-end vs Supabase)
- Phase 5 — Console (Next.js 16) · 6 Wire · 7 Auth UI · 8 Onboarding · 9 Dashboard · 10 Tests

## API (v1)
`/api/v1/auth`: register · verify-email · login · refresh · logout · forgot-password ·
reset-password · me. `/api/v1/organizations`: create · list · get · projects ·
`:orgId/members` · `:orgId/invitations` · `:orgId/api-keys` · `:orgId/audit-logs` ·
`invitations/accept`.

Run: `cd api && npm run dev` (needs `.env` — see `.env.example`).

## Dev
```bash
cd platform/api
cp .env.example .env
npm install
npm run db:generate   # emit SQL migration from the Drizzle schema
npm run db:migrate    # apply to DATABASE_URL
```
