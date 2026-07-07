# Running the connected platform (one compose)

`docker-compose.platform.yml` brings up the three services that were previously
disconnected, wired together:

```
platform-api (:4000)  →  control-plane (:3002, REAL provisioner)  →  aggregator (:3005)
        └── Postgres (:5432, 4 DBs) ── Traefik (:80) ──┘
```

This exists so the end-to-end chain can actually be **run and verified** (the audit's
core gap was that nothing ran the three together).

## Prerequisites (real provisioning needs these)

The control-plane does *real* work — it launches Docker containers, funds testnet
accounts, and issues an asset on-chain. That requires:

```bash
# 1. Generate the master key + anchor-config dir the provisioner needs
cd anchor-service && node scripts/setup-base.mjs          # writes MASTER_KEK + config dir

# 2. Build the per-anchor images the provisioner launches. ALL canonical sources live
#    under anchor-template/ (business-server, operator console, customer app). The older
#    anchor-service/{business-server,client} copies are retired reference only.
docker build -t nordstern/business-server:dev anchor-template/business-server
docker build -t nordstern/operator-console:dev anchor-template/console
docker build -t nordstern/anchor-client:dev    anchor-template/anchor-client

# 3. Export the two vars the compose interpolates (from step 1's output)
export MASTER_KEK=<value>
export ANCHOR_CONFIG_HOST_ROOT=<abs path to the config dir>
```

## Run

```bash
docker compose -f docker-compose.platform.yml up --build
```

Startup order is handled by `depends_on`: Postgres → schema push → control-plane +
aggregator → platform-api.

## Verify the full flow

```bash
# 1. Business applies
curl -sX POST localhost:4000/api/v1/applications -H 'content-type: application/json' \
  -d '{"companyProfile":{"name":"Acme"},"stellarConfig":{},"paymentRails":{},"compliance":{}}'
#   → { id: <applicationId>, ... }

# 2. Admin approves → generates an invite code (see application.service.approve)
curl -sX POST localhost:4000/api/v1/applications/<applicationId>/approve   # (auth may be required)

# 3. Redeem the invitation → triggers the REAL provisioner
curl -sX POST localhost:4000/api/v1/anchor-invitations/redeem -H 'content-type: application/json' \
  -d '{"token":"<inviteToken>","subdomain":"acme","fullName":"Acme Owner","password":"..."}'
#   → { jobId: <jobId>, anchorId, organizationId }

# 4. Watch REAL provisioning status (control-plane's genuine stages)
watch -n2 "curl -s localhost:4000/api/v1/anchor-invitations/status/<jobId>"
#   status: running → stage: "Generating keypairs" → "Funding accounts & issuing asset on Stellar"
#        → "Creating database & containers" → "Waiting for stack to become healthy" → completed

# 5. Aggregator discovered the real anchor
curl -s localhost:3005/anchors            # the provisioned anchor appears (not a seed)

# 6. Quote + route
curl -sX POST localhost:3005/quote -H 'content-type: application/json' \
  -d '{"amount":1000,"currency":"INR","asset":"USDC","rail":"UPI","region":"India"}'
curl -sX POST localhost:3005/route -H 'content-type: application/json' -d '<same body>'

# 7. Handoff → real SEP endpoints (wallet drives SEP-10 → SEP-24 from here)
curl -sX POST localhost:3005/transactions/start -H 'content-type: application/json' \
  -d '{"quoteId":"<quoteId>","account":"<GStellarPubKey>"}'
#   → { handoff: { webAuthEndpoint, transferServer, homeDomain }, next: "..." }
```

## Known caveats (be honest)

- **The provisioned anchor is the old `anchor-service` (ANCH-mint) stack**, not the USDC
  `anchor-template` — because that is the real provisioner being reused. Launching the
  USDC template via the factory is a separate port, not a wiring change.
- **Provisioned anchors are on `*.anchors.localhost` via Traefik** — reachable on your
  host, but the aggregator's `https://<domain>` handoff URL is dev-local (add a hosts
  entry / use the Traefik router). Not internet-reachable without a real domain.
- **SEP-24 is wallet-driven.** The aggregator returns real SEP endpoints; a wallet must
  perform SEP-10 + SEP-24 (the aggregator holds no user key and cannot execute the tx).
- **Aggregator still seeds demo anchors on first init** (`db.ts`). Gate/remove that seed
  if you want a registry of *only* provisioned anchors.
- `drizzle-kit push` on `platform-migrate` applies the schema to a fresh DB without a
  prompt; against a populated DB it may require review.

## Status

This compose is **authored** and validated (`docker compose config` parses). It has
**not** been brought up end-to-end here (needs the prerequisites above + a Docker
daemon + testnet). It is the scaffolding that makes the connected chain *runnable*.
