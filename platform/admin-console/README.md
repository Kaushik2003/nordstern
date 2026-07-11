# Admin Console

The **NordStern-internal** surface — the anchor application review queue. Not founder-facing.

## What it is

A Next.js (App Router) app (`@nordstern/admin-console`) served at **`admin.nordstern.live`** (locally `http://admin.localhost` or `http://localhost:4002`). It lists submitted anchor applications and lets the internal team **approve or reject** them; approval generates a signed redeem invite the founder uses to provision.

## Why it exists

Review is a privileged, internal action. It runs as a **separate app, separate image, separate host** from the founder console so no founder-facing code is served in the admin realm and vice-versa.

## Run it independently

```bash
cd platform/admin-console
npm install
API_URL=http://localhost:4000 npm run dev -- -p 3001     # :3001
```

Log in with the internal admin credentials — **`admin` / `admin`** in dev (the Platform API refuses to boot in production with those defaults).

## Required environment

| Variable | Purpose |
|---|---|
| `API_URL` | Server-side proxy target for `/api/*` (the Platform API). |
| `NEXT_PUBLIC_FOUNDER_URL` | Founder console origin (redeem links the admin copies point there). |

## Commands

`npm run dev` · `npm run build` · `npm start`. In the full stack it is built and served on port **4002** by `infrastructure/docker/platform.yml`.

## Dependencies & interactions

Next.js · React 19 · `@nordstern/shared-ui` · `@nordstern/shared-auth`. Talks only to the **Platform API** (admin realm). Part of the `platform/` npm workspace.
