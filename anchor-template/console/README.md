# Operator Console

The **operator's control surface** for a single anchor. One instance runs per provisioned anchor.

## What it is

A Next.js (App Router) app (`@nordstern/operator-console`, image `nordstern/operator-console:dev`) served at **`console-<slug>.nordstern.live`** (locally `http://console-<slug>.anchors.127.0.0.1.sslip.io`). Modules: overview, transactions, treasury, customers, credentials, compliance, webhooks, API keys, team, audit, reports.

It proxies same-origin to the Platform API and to this anchor's business-server; branding is injected per anchor at launch. It renders **real data only** — no synthetic/mock data in this surface.

## Why it exists

Running an anchor is a real operational job: watch treasury float, resolve stuck transactions, review KYC, configure fees/spread. This console is that job's cockpit, scoped to one anchor.

## Run it independently

```bash
cd anchor-template/console
npm install
npm run dev            # next dev -p 3001
```

Standalone it renders the UI shell; live modules need this anchor's business-server + the Platform API.

## Required environment

The anchor's API/business-server origins and branding are injected per anchor at container launch. Path alias is workspace-local (`@/* → ./*`).

## Commands

`npm run dev` (`:3001`) · `npm run build` · `npm start -p 3001` · `npm run typecheck`.

## Dependencies & interactions

Next.js · React 19. Talks to the **Platform API** (`:4000`) and this anchor's **business-server** (`:3000`). Cloned per anchor by the **control-plane**.
