# Founder Console

The founder-facing surface of the NordStern platform — where a business applies to become an anchor and, once approved, activates it.

## What it is

A Next.js (App Router) app (`@nordstern/founder-console`) served at **`register.nordstern.live`** (locally `http://register.localhost` or `http://localhost:4001`). Surfaces:

- **Apply** (`/register`) — the anchor application wizard.
- **Redeem → provision** (`/redeem`) — activate an approved anchor and watch provisioning stream to `active`.
- **Overview / wallet** — the founder's live-anchor portfolio.

It proxies `/api/*` to the Platform API same-origin, so host-only auth cookies flow without CORS.

## Why it exists

The founder journey (apply → get approved → launch) is distinct from internal review and from operating a live anchor. Keeping it a separate app means no admin-only code is ever shipped to founders.

## Run it independently

```bash
cd platform/founder-console
npm install
API_URL=http://localhost:4000 npm run dev     # :3000
# or point at the live backend for zero-setup UI work:
API_URL=https://api.nordstern.live npm run dev
```

See [`platform/LocalDev.md`](../LocalDev.md).

## Required environment

| Variable | Purpose |
|---|---|
| `API_URL` | Server-side proxy target for `/api/*` (the Platform API). |

## Commands

`npm run dev` · `npm run build` · `npm start`. In the full stack it is built and served on port **4001** by `infrastructure/docker/platform.yml`.

## Dependencies & interactions

Next.js · React 19 · `@nordstern/shared-ui` · `@nordstern/shared-auth`. Talks only to the **Platform API** (same-origin `/api`). Part of the `platform/` npm workspace.
