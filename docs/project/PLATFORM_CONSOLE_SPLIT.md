# Platform Console Split — founder-console + admin-console

> A one-time **architectural** refactor (no feature work): the single `platform/console`
> became two independently deployable Next.js apps behind two subdomains, sharing only
> genuinely-generic code via two workspace packages. Backend, landing, operator console,
> and customer app are untouched. Executed 2026-07-09 on branch
> `refactor/split-platform-console`.

## Why

`platform/console` served two audiences (founders + NordStern admin) as one app split by
path (`/register` vs `/admin`). Production wants them on separate subdomains
(`register.nordstern.live`, `admin.nordstern.live`), deployable as two independent Vercel
projects. This establishes clean product boundaries so future founder work never touches
admin and vice-versa.

## Architecture tree — before → after

**Before**
```
platform/
├─ api/        (backend — UNCHANGED)
└─ console/    (ONE Next app: founder routes + /admin routes)
```

**After** (npm workspace rooted at `platform/`; `api/` intentionally NOT a member)
```
platform/
├─ package.json            # workspace root: [shared-ui, shared-auth, founder-console, admin-console]
├─ package-lock.json       # single workspace lockfile
├─ .dockerignore
├─ api/                    # backend — UNCHANGED (not a workspace member)
├─ shared-ui/              # @nordstern/shared-ui  (generic UI + tokens)
│  ├─ components/ui/{avatar,badge,button,card,dropdown-menu,input,label}.tsx
│  ├─ lib/cn.ts
│  ├─ styles/theme.css     # Tailwind v4 @theme design tokens
│  ├─ index.ts             # barrel export
│  ├─ package.json · tsconfig.json
├─ shared-auth/            # @nordstern/shared-auth  (generic API client)
│  ├─ api.ts               # realm-aware fetch client (api, ApiError)
│  ├─ index.ts · package.json · tsconfig.json
├─ founder-console/        # register.nordstern.live  (:4001 dev)
│  ├─ app/ {page, (auth)/{login,redeem}, register/*, (app)/{overview,wallet}, layout, globals.css, providers}
│  ├─ components/{sidebar, onboarding/*}
│  ├─ lib/{session.ts, validations/onboarding.ts}
│  ├─ public/logo* · next.config.ts · package.json · Dockerfile · tsconfig · postcss
└─ admin-console/          # admin.nordstern.live   (:4002 dev)
   ├─ app/{login/page.tsx, page.tsx (queue), layout.tsx, globals.css}
   └─ next.config.ts · package.json · Dockerfile · tsconfig · postcss
```

## Moved files

**console → founder-console** (renamed dir; history preserved): all app routes except
`/admin`, `components/{sidebar,onboarding/*}`, `lib/{session,validations/onboarding}`,
`public/*`, `providers.tsx`, config files.

**console/app/admin → admin-console** (product logic OWNED by admin):
- `app/admin/login/page.tsx` → `admin-console/app/login/page.tsx`
- `app/admin/page.tsx` → `admin-console/app/page.tsx`
- Client-side navigation rewritten (`/admin/login`→`/login`, `/admin`→`/`); **API paths
  kept `/admin/*`** (backend unchanged).

## Extracted shared modules (only genuinely reusable — the "reused by both?" test)

| Package | Contents | Why shared |
|---|---|---|
| **`@nordstern/shared-ui`** | 7 UI primitives (`avatar, badge, button, card, dropdown-menu, input, label`), `cn()` utility, `styles/theme.css` design tokens | Product-agnostic UI; both apps render them |
| **`@nordstern/shared-auth`** | `api` client + `ApiError` | Generic HTTP/session client; **already realm-aware** (refresh skips `/admin/*`), so identical for both realms |

**Deliberately NOT shared** (each app owns its product logic):
- `session.ts` (`useMe` → `/auth/me` + orgs) — **founder** product logic, not generic.
- `providers.tsx` (react-query) — only founder uses react-query.
- `sidebar.tsx`, `onboarding/*`, `validations/onboarding.ts` — founder product.
- the admin queue/login pages — admin product.

## Docker changes

- **Removed** `platform/console/Dockerfile`.
- **Added** `founder-console/Dockerfile` and `admin-console/Dockerfile`. Both:
  - build context = **`platform/`** (the workspace root) so the shared packages resolve;
  - `npm install` the workspace, then `npm run build -w @nordstern/<app>`;
  - Next.js **standalone** output (traced from the workspace root via
    `outputFileTracingRoot`; shared packages are compiled in via `transpilePackages`).
- **Added** `platform/.dockerignore` (excludes `node_modules`, `.next`, `api/`, `.env`).
- Admin passes `NEXT_PUBLIC_FOUNDER_URL` at build (the copied redeem link targets the
  founder origin, a different host — see Tech debt / behavior preservation).

## Compose changes (`docker-compose.platform.yml`)

- **Removed** service `platform-console`.
- **Added** `founder-console` (`:4001`) and `admin-console` (`:4002`), each with
  `build.context: ./platform` + `dockerfile: <app>/Dockerfile`, `API_URL`, and Traefik
  host labels. founder keeps `:4001` so `CONSOLE_URL`/redeem-email links stay valid.

## Traefik changes (host-based, no path routing)

```
founder-console  →  Host(`register.localhost`)  → :3000
admin-console    →  Host(`admin.localhost`)     → :3000
```
Added via container `labels` (Traefik's Docker provider is `exposedbydefault=false`, so
only labelled services route). Prod swaps hosts for `register.nordstern.live` /
`admin.nordstern.live` (+ TLS).

## Verification checklist (all ✅ executed)

| Check | Result |
|---|---|
| Founder console typechecks + builds | ✅ routes `/ /login /overview /redeem /register /wallet` |
| Admin console typechecks + builds | ✅ routes `/ /login` |
| Two separate Docker images build | ✅ `nordstern-platform-{founder,admin}-console` |
| Compose boots both | ✅ founder `:4001`, admin `:4002` |
| Traefik routes by host | ✅ `register.localhost`→founder, `admin.localhost`→admin |
| Product isolation | ✅ `admin.localhost/register`=404, `register.localhost/admin`=404 |
| `/api/*` proxy intact | ✅ founder OTP→`{ok:true}`, admin `/me`→401 |
| Cookies host-only | ✅ unchanged (backend sets host-only; nothing added a parent-domain cookie) |
| Backend unchanged | ✅ `git status platform/api` empty |
| Landing / operator console / customer app untouched | ✅ no changes outside `platform/` (+ compose) |

## Deployment notes (Vercel / prod)

- Two Vercel projects, same repo, **Root Directory** = `platform/founder-console` /
  `platform/admin-console`. Vercel installs the npm workspace natively; no build hacks.
- Per-app env: `API_URL` = the deployed platform-api base; admin also
  `NEXT_PUBLIC_FOUNDER_URL=https://register.nordstern.live`.
- platform-api `CONSOLE_URL` should become `https://register.nordstern.live` in prod so
  approval/redeem email links point at the founder console.

## Technical debt discovered / deferred (no feature work done)

1. **`shared-auth/middleware.ts` not created.** No middleware exists today and two
   standalone apps don't need host-gating; the package is ready to host one later.
2. **Slug reservation not enforced in code.** `admin/register/console/api/sep/www` are
   reserved by hosting convention, but no backend check rejects an anchor slug with those
   names yet. Add a guard in provisioning.
3. **Missing routes are intentionally absent** (would be new features): founder
   `/applications`; admin `request-changes`, `fleet`, `provisioning monitoring`,
   `internal dashboards`. Backend supports only approve/reject today.
4. **`founder-console/app/(app)/wallet`** is a dev "SEP sandbox" tool with a hardcoded
   default subdomain — relocated as-is; revisit whether it belongs in the founder product.
5. **npm audit:** 2 moderate advisories in the workspace deps (pre-existing) — triage
   separately.
6. **Domain spelling:** standardized on **`nordstern.live`** (some notes said
   `northstern.live`).
