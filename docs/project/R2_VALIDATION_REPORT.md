# R2 Validation Report — End-to-End Provisioning with SecretStore

**Verdict: R2 is PROVEN end-to-end.** A brand-new business application was submitted,
approved, redeemed in Test Mode with sample Razorpay + Cashfree credentials, and a fully
isolated anchor was provisioned on Stellar **testnet** — with credentials living in the
SecretStore (LocalStack / AWS Secrets Manager), **never** in Postgres, and injected into
the business-server at launch. Two real bugs were found and fixed during validation.

**Date:** 2026-07-07 · **Branch:** `feat/platform-infra-and-money-safety` · **Network:** testnet

---

## 0. Environment

| Component | Value |
|---|---|
| Stack | `docker-compose.platform.yml`: db, traefik, **secrets (LocalStack)**, control-plane, aggregator, platform-migrate, platform-api |
| SecretStore backend | LocalStack `secretsmanager` @ `http://secrets:4566` (boot log: `SecretStore: AWS Secrets Manager backend`, endpoint `http://secrets:4566`) |
| Secret path | `nordstern/testnet/anchor/<slug>` (identical to `terraform/secrets.tf` + ESO) |
| Provisioned anchor | `anchor-service` stack (AP + business-server + client + console) |

**Method:** sentinel secret values (`…SENTINEL_9f3a`, `…SENTINEL_7b2c`, `…ORBIT_zz`) were used
so leakage into Postgres/logs/API could be proven by substring scan.

---

## 1. Journey Steps & Evidence

| # | Step | Result | Evidence |
|---|------|--------|----------|
| 1 | Submit application (new `{companyProfile, product}` shape, Test Mode) | ✅ | Stored `status:applied`; DB row holds `profile` + `product` only |
| 2 | Approve | ✅ | `status:approved`; secure `rawToken` (32-byte) returned; email derived from `profile.businessEmail` |
| 3 | Redeem (Test Mode + Razorpay + Cashfree creds) | ✅ | `{mode:test, provisioning:started}`; **response leaked 0 secret substrings** |
| 4 | Creds written to **SecretStore, not DB** | ✅ | LocalStack `get-secret-value nordstern/testnet/anchor/mizupay` → all 4 keys present |
| 5 | DB stores **only references** | ✅ | `secret_refs`: `(razorpay/cashfree, secret_provider=aws, path=…/mizupay, key_names=[…])` — no values |
| 6 | Full-DB secret scan | ✅ | `pg_dump platformdb \| grep SENTINEL` → **0 occurrences** |
| 7 | Provisioning to terminal | ✅ | `status:completed`, asset `MIZUPAY` issued on testnet, `homeDomain=mizupay.anchors.127.0.0.1.sslip.io`, attempts=1 |
| 8 | Control-plane retrieves secrets | ✅ | Injected into business-server env (below); CP log: `[provision] mizupay → active` |
| 9 | Business-server receives expected env (masked) | ✅ | `ASSET_CODE=MIZUPAY`, `KYC_PROVIDER=mock`, `DEPOSIT_PROVIDER=razorpay`, `PAYOUT_PROVIDER=cashfree`, `RAZORPAY_KEY_ID=rzp_te…`, `RAZORPAY_KEY_SECRET=***`, `CASHFREE_*=***` |
| 9b | Injection **correctness** | ✅ | Injected env contains the exact sentinel secret values from LocalStack (count = 2) |
| 10 | Anchor starts | ✅ | Containers up: `anchor-platform-mizupay`, `business-server-mizupay`, `anchor-client-mizupay`, `operator-console-mizupay` |
| 11 | Aggregator auto-registers | ✅ | `GET /anchors` → `id:mizupay, status:active, current_availability:true, supportedAssets:[MIZUPAY]` |
| 12 | Routing (Traefik) | ✅ | client `200`, `api.…/health 200`, `sep.…/.well-known/stellar.toml 200`, `console.… 307` |
| 13 | Customer URL reachable | ✅ | `http://mizupay.anchors.127.0.0.1.sslip.io/` → 200 |
| 14 | SEP-1 TOML is real | ✅ | Serves testnet `NETWORK_PASSPHRASE`, `WEB_AUTH_ENDPOINT`, `TRANSFER_SERVER_SEP0024`, `SIGNING_KEY`, `[[CURRENCIES]]` |
| 15 | Operator console URL | ⚠️ | `console.… 307` (reachable) — but launched from a **stale local image**; the repo source is empty (`anchor-template/console/`). Real console is **R3**. |

---

## 2. Security Verification

| Check | Result | Evidence |
|---|---|---|
| PSP creds never in plaintext in Postgres | ✅ PASS | `pg_dump platformdb \| grep SENTINEL` = 0; `secret_refs` holds refs only |
| API responses never return secrets | ✅ PASS | redeem response = 0 secret substrings; operator `GET/PUT/rotate` return **masked** shape (`keyNames` + timestamps, no values) |
| Logs never print secrets | ✅ PASS | `platform-api` + `control-plane` logs → 0 sentinel occurrences |
| Only references persisted | ✅ PASS | `secret_refs` = `{provider, secret_provider, secret_path, key_names, timestamps}` |
| Secret retrieval only at provisioning/runtime | ✅ PASS | Control-plane reads via `readAnchorSecrets(slug)` only inside `createAnchorStack` at container launch |

---

## 3. Failure Testing

| Test | Expected | Result | Evidence |
|---|---|---|---|
| Redeem same invitation twice | reject | ✅ | HTTP 400 `Invitation has already been redeemed` |
| Missing Cashfree creds (ZenPay, Razorpay only) | payout degrades to mock | ✅ | `DEPOSIT_PROVIDER=razorpay`, `PAYOUT_PROVIDER=mock`, no `CASHFREE_*`, only razorpay `secret_refs` |
| Invalid: empty credential value | reject | ✅ | HTTP 400 `Empty value for 'RAZORPAY_KEY_ID'` |
| Invalid: unknown provider | reject | ✅ | HTTP 400 `Unsupported provider 'paypal'` |
| Invalid: empty credentials object | reject | ✅ | HTTP 400 `No credentials provided` |
| Secret rotation | store updated, masked, isolated, no PG plaintext | ✅ | operator `POST …/razorpay/rotate` → LocalStack shows rotated value, Cashfree untouched, `secret_refs.last_rotated_at` set, `pg_dump \| grep ROTATED` = 0 |
| Provisioning retry after failure | resume same anchor, re-inject | ✅ (after fix) | See Bug B. Final proof (orbit): retry → single tenant `orbit` active, **no orphan**, rebuilt business-server re-injected both creds (count 2) |
| Invalid credential *values* (semantically wrong but non-empty) | stored as-is; surfaces at runtime | ✅ (documented) | The SecretStore does not validate against the PSP; a wrong key fails at the first real Razorpay/Cashfree call (runtime), not at provisioning. See §5. |

---

## 4. Bugs Discovered & Fixed

### Bug A — Provisioning hard-failed on missing optional images
- **Symptom:** `orchestrator.createAnchorStack` called `ensureImage` on `nordstern/anchor-client:dev` **and** `nordstern/operator-console:dev`. The operator-console has **no source** (empty `anchor-template/console/`), so `ensureImage` would try to pull a nonexistent image and throw — provisioning could never complete on a clean machine.
- **Root cause:** client/console treated as hard requirements.
- **Fix:** `imageAvailableLocally()` — client/console are launched only if their image exists locally; otherwise skipped with a warning. AP + business-server remain hard requirements. (`anchor-service/control-plane/src/orchestrator.ts`)

### Bug B — Retry created a divergent anchor (orphan + un-injected creds)
- **Symptom:** on retry, a second anchor `novapay-69s5` was created, leaving an **orphan** `novapay` tenant (status `error`); creds stored at path `…/novapay` were **not** injected into `…/novapay-69s5` → a broken anchor (`DEPOSIT_PROVIDER=razorpay` with no Razorpay keys).
- **Root cause:** `triggerProvisioningJob` always called `provisionerService.start`, which made the control-plane mint a **new** anchor (slug-suffixed on clash) instead of resuming the failed one — so the secret path diverged.
- **Fix:**
  - `provisionerService.resume(cpAnchorId)` re-provisions the **existing** control-plane anchor (same slug → same secret path). (`platform/api/src/services/provisioner.service.ts`)
  - `triggerProvisioningJob` calls `resume` when the job already has a `cpAnchorId`, else `start`. (`anchorInvitation.service.ts`)
  - `runProvision` is now idempotent — `DELETE FROM anchor_secrets WHERE tenant_id` before regenerating, so re-provision can't collide. (`control-plane/src/provision.ts`)
- **Verified:** orbit retry → single `orbit` tenant (active, no orphan), rebuilt business-server re-injected **both** creds (count 2), adapters correct.

---

## 5. Remaining Blockers & Notes

- **Operator console has no source (R3).** It currently only runs because a stale
  `nordstern/operator-console:dev` image happens to exist locally; there is no repo
  source to rebuild it. Building the real console is R3.
- **LocalStack community is ephemeral.** Restarting the `secrets` container wipes all
  secrets (PERSISTENCE is a LocalStack Pro feature). This bit the first retry test (the
  restart wiped the secret retry would re-read) — a **test-harness artifact, not a product
  bug**; prod AWS Secrets Manager is durable. Documented in the compose file. For faithful
  local retry testing, don't restart `secrets` mid-test (or use Pro persistence).
- **No upfront PSP credential validation.** The SecretStore stores whatever strings it's
  given; a semantically-wrong-but-non-empty key surfaces only at the first live PSP call.
  Acceptable for R2; a "test connection" check is a future hardening.
- **Rotation doesn't hot-reload a running container.** `rotate` updates the store; the
  running business-server keeps its injected env until re-provisioned/restarted (in prod,
  ESO refresh + pod restart). Expected; document for operators.
- **Approve endpoint is unauthenticated** (dev bypass) — pre-existing, out of R2 scope,
  tracked for the admin surface.

---

## 6. Summary

| Area | Status |
|---|---|
| Onboarding data → provisioning flow-through | ✅ Proven (adapters resolved from mode + creds) |
| SecretStore: creds in store, refs in DB, nothing in PG | ✅ Proven (sentinel scans = 0) |
| Provisioner retrieves + injects secrets | ✅ Proven (injected values match store) |
| Anchor start + aggregator registration + routing | ✅ Proven (live, 200s, `current_availability:true`) |
| Security (no plaintext / no leak / masked responses) | ✅ Proven |
| Failure handling (double-redeem, missing creds, invalid, rotation, retry) | ✅ Proven (2 bugs found & fixed) |
| Operator console surface | ⚠️ R3 (no source yet) |

**R2 foundation is verified. Cleared to proceed to R3 (customer frontend + operator console).**
