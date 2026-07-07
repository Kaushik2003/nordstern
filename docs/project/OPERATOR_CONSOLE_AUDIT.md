# Operator Console — backend endpoint audit

> Mandatory audit before building the remaining modules. Every `/admin/*` endpoint on the
> business-server, its real response, whether it has UI, and — critically — **where the
> backend itself fabricates data** (which must be fixed or documented, never surfaced as real).
> Also covers the platform-api endpoints the console reaches via `/api/v1`.

Verified against `anchor-template/business-server/src/admin.ts` and a live provisioned
anchor (`anchordb_splitfix`) on 2026-07-07.

## business-server `/admin/*` (per-anchor, org-scoped via `requireOperator`)

| Endpoint | Purpose | Real response today | UI? | Missing UI | Backend gap / fabrication |
|---|---|---|---|---|---|
| `GET /summary` | Dashboard rollups | **Real**: treasury (Horizon), counts/volume (Platform API), live health. `fiat.bank*` = null (honest). | ✅ Overview | — | none (de-mocked) |
| `GET /transactions` | Ledger | **Real**: normalized SEP-24 txns from Platform API | ✅ Transactions | — | none |
| `POST /transactions/:id/retry` | Re-drive | **Real**: `releaseDeposit` + audit | ✅ | — | none |
| `POST /transactions/:id/refund` | Refund | **Real**: `patchTransaction(error)` + audit | ✅ | — | none |
| `GET /users` | Customers | **⚠️ Mostly fabricated**: only `id`(account)/`txCount`/`lifetimeVolume`/`lastSeen` are real (derived from txns). `email`, `phone`, `city/state`, `status`('verified'), `tier`, `risk`, `matchScore`, `source`, `verifiedAcross` are **hardcoded fakes**. | ❌ | Customers | **Fabrication** — strip fakes; join real `kyc_verifications` for status |
| `GET /compliance/cases` | Case queue | **Real table** `compliance_cases` (reason/severity/status/amount/note/timestamps) **but** synthesizes `email`/`phone` per case; **table is seeded with 4 demo cases on every fresh anchor** | ❌ | Compliance | Strip synthesized PII; **drop demo seeds** |
| `POST /compliance/cases/:id/resolve` | Resolve | **Real**: updates status/note + audit | ❌ | Compliance | none |
| `GET /compliance/audit` | Audit trail | **Real**: hash-chained `audit_logs`; **seeded with 5 demo rows on fresh anchor** | ❌ | Audit Logs | **Drop demo seeds** |
| `GET /developer/keys` | API keys | **Real table** `api_keys` **but returns plaintext `secret`** alongside masked; **seeded with 2 demo keys** | ❌ | API Keys | **Stop returning plaintext on list**; drop demo seeds |
| `POST /developer/keys` | Create key | **Real**: inserts, returns plaintext once | ❌ | API Keys | none (plaintext-once is correct) |
| `DELETE /developer/keys/:id` | Delete key | **Real** | ❌ | API Keys | none |
| `POST /developer/keys/:id/roll` | Rotate | **Real**: new secret, returns plaintext once | ❌ | API Keys | none |
| `GET /developer/webhooks/deliveries` | Webhook log | **❌ Fully mock** — returns a hardcoded 3-item array. **Real table `webhook_deliveries` exists but is empty and ignored; nothing populates it.** | ❌ | Webhooks | **Endpoint mock**; query real table + wire population |
| `GET /strategy` | Pricing/limits | **Real**: latest `strategy_config` (feeTiers, fixed/percentageFee, min/maxDeposit, maxSingleTx, dailyVolumeLimit, emergencyStop, maintenanceMode, autoPauseThreshold, riskScoreThreshold, settlementBufferMin, supportedRails) | ❌ | Pricing & Strategy | none |
| `POST /strategy` | Update pricing | **Real**: versioned insert + audit | ❌ | Pricing & Strategy | none |
| `POST /treasury/sweep` | Sweep | **Real**: audit-only (no bank integration to move funds) | ✅ Treasury | — | sweep is audit-only (documented) |
| `POST /treasury/pause` | Emergency stop | **Real**: toggles `strategy.emergencyStop` + audit | ✅ Treasury | — | none |

## platform-api `/api/v1/*` (org-scoped; console reaches via `/api/*` proxy)

| Endpoint | Purpose | Real? | UI? | Notes |
|---|---|---|---|---|
| `GET /anchors/resolve?slug=` | Bootstrap {orgId, anchorId, role} | ✅ | used by anchor-context | how the console learns its org/anchor |
| `GET /organizations/:orgId/members` | Team list | ✅ | ❌ | Team Management |
| `PATCH /organizations/:orgId/members/:id` | Change role | ✅ | ❌ | Team Management |
| `DELETE /organizations/:orgId/members/:id` | Remove member | ✅ | ❌ | Team Management |
| `GET/POST /organizations/:orgId/invitations` | Invites (list/create) | ✅ | ❌ | Team Management |
| `POST /organizations/:orgId/invitations/:id/revoke` | Revoke invite | ✅ | ❌ | Team Management |
| `GET /organizations/:orgId/audit-logs` | Platform audit | ✅ | ❌ | org-level (distinct from anchor audit) |
| `GET/PUT/POST/DELETE .../credentials` | PSP creds (SecretStore) | ✅ | ✅ Credentials | write-only |

## Backend gaps discovered (must be fixed or documented — never faked)

1. **`GET /users` fabricates customer PII/KYC/tier/risk.** Fix: return only real, derived fields; join `kyc_verifications` for real status. `email`/`phone`/`city`/**freeze-account** have **no real source** → document as missing, do not display.
2. **`GET /developer/webhooks/deliveries` is a hardcoded mock.** Real `webhook_deliveries` table exists but is **empty and unpopulated** (the HMAC webhook path doesn't record deliveries). Fix endpoint to read the table; **wiring population is a backend task** → until then the module shows an honest empty state.
3. **`GET /developer/keys` returns plaintext secrets on list.** Fix: list returns masked only; plaintext surfaces once on create/roll. Note: these are **DB-stored keys in `nordstern.api_keys`, not the platform SecretStore** (which holds PSP creds) — the two are different systems.
4. **Fresh anchors ship demo SEEDS**: 4 `compliance_cases`, 5 `audit_logs`, 2 `api_keys`. These are placeholder data that violate "no mock data" → **removed via migration** so the console shows only real activity.
5. **No runtime branding/settings-edit endpoint.** Branding is set once at provision (provisioner `branding` map → orchestrator env). Settings can **display** current branding (from `/anchors/resolve` + env) but **cannot edit** it live → document; editing needs a new endpoint.
6. **No CSV/report export endpoint.** Reports must be **computed client-side** from `/summary` + `/transactions`; the export button is **disabled with an explanation**, not mocked.
7. **`fiat.bankBalance/reservedBalance/dailySettlement`** have no bank integration → already null (Dashboard shows "not connected").
8. **`treasury/sweep`** is audit-only (no bank rail to actually move funds) → labeled as such in Treasury.

## Build order (real-data-clean first)
1. Backend truthfulness pass (this must land first): drop demo seeds; de-fabricate `/users`, `/compliance/cases`, `/developer/keys` (no plaintext on list), `/developer/webhooks/deliveries` (real table).
2. **Pricing & Strategy** (fully real) → **Audit Logs** (real) → **API Keys** (real) → **Compliance** (real) → **Reports** (computed) → **Team** (platform-api) → **Customers** (real fields + documented gaps) → **Webhooks** (real empty + documented) → **Settings** (read-only + documented).
