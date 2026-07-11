# NordStern — Local Stack Walkthrough (Plain English)

> A learning log. We bring the platform up **one container at a time**, and for each
> one write down — in plain English, no jargon — *what it is* and *what it contributes
> to*. Built live while starting the stack on 2026-07-09. Grows as we go.
>
> **Companion:** [`Testing.md`](Testing.md) (QA checklist).

---

## The mental model (start here)

The platform is a **factory that builds Stellar anchors**, plus the databases and
plumbing that keep the factory and its anchors running. We start it bottom-up: the
things everything else depends on come first.

### Startup order

| Step | Service | One-line role | Depends on |
|------|---------|---------------|-----------|
| 1 | **db** (postgres:15) | Shared memory of the whole platform | — |
| 2 | **secrets** (localstack) | Vault for real credentials (PSP keys, etc.) | — |
| 3 | **traefik** (v3.7) | Traffic cop — routes each anchor's web address | — |
| 4 | **platform-migrate** | One-shot: sets up `platformdb` tables, then exits | db |
| 5 | **platform-api** (:4000) | Front office — onboarding, auth, drives provisioning | db, migrate |
| 6 | **control-plane** (:3002) | Factory floor — actually builds anchors | db, secrets, traefik |
| 7 | **aggregator** (:3005) | Directory — lists/routes live anchors | db |
| 8 | **platform-console** (:4001) | The founder + admin website | platform-api |
| — | *per-anchor stacks* | Built **by** control-plane during provisioning, not by compose | control-plane |

### The command we use (and why each part)

```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d <service>
```

- `docker compose` — manages a group of containers described in a YAML file.
- `--env-file anchor-service/.env.base` — fills in `${VARIABLES}` in the YAML (the master
  encryption key, config paths, JWT secret). Missing → services misbehave.
- `-f infrastructure/docker/platform.yml` — pins us to the **correct** stack file (not the default).
- `up -d` — create/start in the background (`-d` = detached, returns your prompt).
- `<service>` — act on only that one service, so we go one at a time.

Verify a service with `... ps <service>` (look for `Up (healthy)`).

---

## Step 1 — `db` (PostgreSQL)

**What it is:** one PostgreSQL server — the **shared memory** of the whole platform.
Almost everything that "remembers" anything writes here. If it's down, nothing works:
no login, no applications, no provisioning, no transactions.

**Inside it are four separate databases**, each owned by a different part of the system
so they don't step on each other:

| Database | Owner | What it remembers (plain terms) |
|----------|-------|----------------------------------|
| **`platformdb`** | platform-api | Front-office records: founder accounts, login codes, business **applications**, admin approvals, invitation tokens, **provisioning jobs** (building/done/failed). |
| **`controldb`** | control-plane | Factory-floor records: every anchor built (slug, web address, its containers) and the **encrypted signing keys** for each anchor's Stellar wallet. Most sensitive data; keys stored scrambled. |
| **`aggregatordb`** | aggregator | Directory records: all live anchors, their fees/health, and routing decisions. |
| **`anchordb`** + one **`anchordb_<slug>`** per anchor | each anchor | That anchor's **money ledger**: deposits, withdrawals, statuses, KYC results, payment records. Each anchor gets its **own** DB — a core reason anchors can't see each other's data. |

**What it contributes to:**
- *Founder onboarding* → application + approval live in `platformdb`.
- *Provisioning* → job status in `platformdb`; finished anchor + keys in `controldb`; a new `anchordb_<slug>` is created.
- *A customer buying* → the transaction and the money-safety bookkeeping (the "outbox" that prevents double-spends) live in that anchor's `anchordb_<slug>`.
- *Multi-tenant isolation* → enforced physically: separate DB per anchor = no cross-tenant leakage at the data layer.

**Important nuance:** actual customer **funds never sit in this database**. It stores
*records about* money movement, not the cash. Money moves wallet ⇄ anchor treasury ⇄
bank rails on the outside — NordStern stays **non-custodial**. Postgres holds the
*bookkeeping*, not the *money*.

**How we started & verified it:**
```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d db
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml ps db   # want: Up (healthy)
docker exec -it nordstern-platform-db-1 psql -U anchor -l                                 # list the databases
```

**Gotcha we hit:** the container showed `CREATED ...seconds ago` — Compose **recreated**
it (because the `postgres:15` image was re-pulled). That's safe: data lives in the named
`pgdata` **volume**, which survives container recreation. `pg-init.sql` only runs on a
*fresh* volume, so we list the DBs to confirm the four (plus any `anchordb_<slug>`)
survived.

---

## Step 2 — `secrets` (LocalStack)

**What it is:** a private **vault** for real credentials, running on your laptop.
Technically it's **LocalStack** (a fake AWS) pretending to be **AWS Secrets Manager**.
Its only job is to hold sensitive values — mainly a business's payment-provider
(Razorpay / Cashfree) API keys, plus things like the anchor's treasury secret.

**Why it exists — the one rule it enforces:** secret *values* must **never** be stored
in the Postgres database or in the code. The database stores only a **pointer** ("the
Razorpay key for anchor `solaris` lives in the vault at path X"); the actual key lives
only inside this vault. So a leaked database yields pointers, not keys.

**What it contributes to:**
- *Founder redeem / activation* — when a founder types their PSP keys during
  provisioning, the keys go **into this vault**; only a pointer goes to the database.
- *A running anchor* — when it needs to charge a customer via Razorpay, its
  business-server fetches the real key **from the vault** at runtime.
- *Security posture* — it's what makes "secrets never in the repo, never in the DB"
  actually true.

**Caveat (important):** LocalStack Community is **ephemeral** — the vault is wiped when
the container stops. So credentials for previously-provisioned anchors are gone after a
restart; you'd re-enter them to run a real payment. (Also in the DR runbook.)

**How we started & verified it:**
```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d secrets
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml ps secrets   # want: Up (healthy)
```
(Listens on port **4566** — the standard LocalStack endpoint.)

### Will this work in real AWS too? (verified against the code)

**Yes by design — but not yet proven live.** The vault code
(`platform/api/src/lib/secrets/`) uses the **real AWS SDK**, not a LocalStack-specific
library. LocalStack speaks the exact same API as AWS, so the SDK can't tell them apart.
**Only one setting changes between dev and prod — the endpoint:**

| | Dev (LocalStack) | Prod (real AWS) |
|---|---|---|
| `SECRETS_ENDPOINT` | `http://localhost:4566` | **unset** → real AWS |
| Credentials | dummy `test`/`test` (ignored) | **omitted** → machine's IAM role (IRSA on EKS) |
| Code path & secret layout | identical | identical |

Secrets are laid out **one per anchor** at a path like `nordstern/testnet/anchor/mizupay`
— the same convention the production Terraform and External Secrets Operator use. A safety
rail refuses the volatile in-memory backend in production, so a misconfig can't silently
drop real keys into memory.

**The honest caveat:** the *application code* is AWS-correct and production-ready, but the
*AWS environment it would talk to* hasn't been stood up yet. Two things stand between
"designed for parity" and "proven in AWS": (1) the **Terraform is un-applied** — the AWS
secrets + IAM read-permissions aren't created yet; (2) prod auth flips from dummy creds to
an **IAM role**, whose policy is written but not verified live. So the risk isn't in this
code — it's in the un-applied infrastructure, which we'd validate on first deploy.

---

## Step 3 — `traefik` (the front door / traffic cop)

**What it is:** a **reverse proxy** — the single thing listening on port **80**. Its whole
job is to read the **web address (hostname)** of each incoming request and forward it to
the right container behind the scenes. The browser only ever talks to Traefik; Traefik
does the fan-out to the many anchors.

**Why you need it:** every anchor has its own set of containers (Anchor Platform,
business-server, customer app, operator console). They can't all sit on port 80. Traefik
sits in front and tells them apart by hostname:

| A request for… | Traefik routes it to… |
|----------------|------------------------|
| `solaris.anchors.localhost` | *solaris*'s Anchor Platform (SEP endpoints / customer app) |
| `console-solaris.anchors.localhost` | *solaris*'s operator console |
| `solaris.anchors.localhost/sep/...` | *solaris*'s business-server (higher-priority path rule) |

**The clever part — it configures itself.** We don't edit a config file when a new anchor
is born. Traefik **watches Docker**; when the control-plane creates an anchor's containers,
they come up stamped with **labels** ("route `foo.anchors.localhost` to me on port 8080").
Traefik sees the labels appear and **instantly starts routing — no restart**. Tear the
anchor down and its routes vanish. That's why it's a foundation service: it must be
watching *before* any anchor exists.

**What starting it did (from its actual command flags):**
| Flag | Plain English |
|------|---------------|
| `--providers.docker=true` | Watch Docker; discover routes from running containers, not a static file. |
| `--providers.docker.exposedbydefault=false` | Ignore a container unless it explicitly opts in (`traefik.enable=true`). This is why nothing routes yet. |
| `--providers.docker.network=nordstern-net` | Reach target containers over the shared `nordstern-net` bridge (every service + anchor joins it). |
| `--entrypoints.web.address=:80` | Open the front door on port 80. |
| `--api.dashboard=true --api.insecure=true` | Turn on the live dashboard (no auth — **dev only**) at `http://localhost:8090`. |

**State right now:** live but **idle** — only db/secrets/traefik are running and none ask
to be routed, so the routing table is essentially empty. The dashboard (`:8090`) confirms
it's up and waiting for anchors.

**What it contributes to:**
- *White-label addressing* — each anchor gets its own hostname on the same port 80.
- *Multi-tenant isolation at the network edge* — requests are separated by hostname before
  they ever reach an anchor.
- *The "factory" feel* — new anchors become reachable the instant they're provisioned, with
  zero manual networking.

**How we started & verified it:**
```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d traefik
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml ps traefik   # want: Up (ports 80 + 8090)
```
Note: Traefik shows plain `Up` (no healthcheck defined) — that's fine. In **prod** the same
setup adds TLS + a real wildcard domain (`*.nordstern.live`); that's config, not new code.

---

## Step 4 — `platform-migrate` (one-shot table setup)

**What it is:** not a long-running service — a **one-shot job**. It starts, does one task,
and **exits**. `Exited (0)` is *success*, not a crash.

**What it does, plain English:** it makes sure the **tables inside `platformdb`** exist and
match the code, so platform-api has somewhere to write. It runs `npx drizzle-kit push`
(Drizzle maps the app's TypeScript schema to real SQL tables) — in effect telling Postgres
*"ensure `users`, `organizations`, `applications`, `anchors`, `provisioning_jobs`,
`sessions`, … all exist and match the schema."* If they're already correct, it does nothing.

**Why it runs before platform-api:** platform-api assumes its tables exist — it does **not**
create them itself. So: migrate first, let it finish, *then* start the API.

**What we saw:**
```
[] Pulling schema from database...
[i] No changes detected
platform-migrate-1 exited with code 0
```
- `No changes detected` → the tables already existed and matched the code (nothing to do).
- `exited with code 0` → clean success. **`Exited (0)` = finished OK** (non-zero would be a problem).
- It also waited for `db` to be `Healthy` first — dependency ordering working as intended.
- **Bonus confirmation:** "No changes detected" proves the `pgdata` volume survived the
  earlier db recreation — prior data is intact.

**How we ran it (foreground, to watch it):**
```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up platform-migrate
```
(No `-d`, so it runs in the foreground and prints its result, then returns the prompt. First
run may build the `./platform/api` image.)

**What it contributes to:** it's the guarantee that the database *shape* matches the code
before the app touches it — the reason we moved away from creating tables at runtime toward
versioned, explicit migrations.

---

## Step 5 — `platform-api` (:4000, the onboarding backend)

**First, a framing that helps everything after this.** The stack splits in two:

- **Plumbing** (db, secrets, traefik) — *infrastructure*. Off-the-shelf; stores, holds, and
  routes things; makes **no** product decisions.
- **Backends** (platform-api, control-plane, aggregator, each anchor's business-server) —
  *our application code*. Each is a **Node.js + Express server** that contains business
  logic and owns one slice of the database.

There is **no single "brain."** There are **four backends**, each owning one job:

| Backend (all Express/Node) | Owns | Job |
|---|---|---|
| **platform-api** (:4000) | `platformdb` | Onboarding, auth, applications, **starts** provisioning |
| **control-plane** (:3002) | `controldb` | Actually **builds** anchors (Docker + Stellar keys) |
| **aggregator** (:3005) | `aggregatordb` | **Directory** of live anchors + routing |
| each anchor's **business-server** (:3000) | that anchor's `anchordb_<slug>` | Moves the **money** for that one anchor |

**What `platform-api` is:** the **front-office backend** — the one the founder website and
admin panel talk to. It speaks only JSON (no screens of its own). It's the brain *of
onboarding*, not of the whole platform.

**What it handles:**
- **Auth** — founder/operator email-OTP login **and** the separate admin username/password
  login; issues the session cookies.
- **Applications** — receives the business application from the `/register` wizard; lets
  admins list/approve/reject; mints the invitation token on approval.
- **Redeem → provisioning** — on redeem it creates the org/anchor records + a **provisioning
  job**, then **calls the control-plane** to build the anchor and polls status. Conductor,
  not tool-holder.
- **Customer identity** — central customer accounts (email-OTP, linked wallets, KYC status),
  shared across anchors.

**Where you access it:** you don't open a backend in a browser — you reach it through its
**frontend**, `platform-console` (:4001, Step 8):
| Surface | URL (once console is up) | Auth |
|---|---|---|
| Founder | `localhost:4001/register`, `/login`, `/redeem`, `/overview` | email OTP |
| **NordStern Admin** | `localhost:4001/admin/login` → `/admin` | username + password |

Both surfaces call `platform-api` behind the scenes. Directly, you can only poke it:
`curl localhost:4000/health` → `{"status":"ok"}`.

**Gotcha we hit — Compose pulled up its dependencies.** `up -d platform-api` also started
**control-plane** and **aggregator** (and re-ran the migrate one-shot), because platform-api
`depends_on` them in the compose file. So Steps 6 & 7 came up automatically — we *explain*
them next rather than start them. (platform-api doesn't need them to boot; it only calls them
later, at redeem time.)

**How we started & verified it:**
```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d platform-api
docker compose ... ps platform-api        # want: Up on :4000
curl -s localhost:4000/health             # {"status":"ok"}
```
If it **crashes on boot**, the usual cause is a missing `JWT_ACCESS_SECRET` /
`JWT_REFRESH_SECRET` / admin credential in the env — check `... logs platform-api`.

---

## Step 6 — `control-plane` (:3002, the factory floor) (auto-started via depends_on)

**What it is:** the backend that **actually builds an anchor**. platform-api is the front
office that takes the order ("provision an anchor for this business"); control-plane is the
workshop that does the physical work. It owns `controldb`. (Came up automatically with
platform-api via `depends_on`.)

### What it does when it gets a "build an anchor" request (`provision.ts`)

1. **Generates Stellar keypairs** — issuer, distribution, signing (see below).
2. **Encrypts + stores the keys** — into `controldb` (`anchor_secrets`), secret seeds
   scrambled with `MASTER_KEK` (from `.env.base`); public keys stored in the clear.
3. **Funds accounts + issues the asset on Stellar** — Friendbot (testnet faucet) funds the
   accounts, then establishes the anchor's token on-chain. ("Funding accounts & issuing
   asset on Stellar" stage.)
4. **Writes the anchor's config** — per-anchor `stellar.toml`, `anchor-platform.yaml`,
   `assets.yaml`.
5. **Creates the anchor's own DB** — `anchordb_<slug>`.
6. **Launches the anchor's containers** (below) + **stamps Traefik labels** so they get
   public hostnames.
7. **Waits for health → marks the anchor `active`.**

### The three Stellar keys (what they actually are)

Every Stellar account is a **keypair**: a **public key** (`G…`, the account *address* — safe
to share, like an account number) and a **secret seed** (`S…`, the *password* that controls
all funds — never exposed). "Public in the clear, secret encrypted" = the `G…`s are stored
plainly; the `S…`s are locked in the vault because they *are* the money.

An anchor uses **three** keypairs, by standard practice:

| Keypair | Plain-English role | Why separate |
|---|---|---|
| **Issuer** | The **mint** — the origin of the anchor's token (a token is identified as `CODE:ISSUER_ADDRESS`). | Most sacred key; used rarely, locked away. Compromise = token integrity gone. |
| **Distribution** | The **cash register / treasury float** — holds the working token supply handed to customers on deposit and received back on withdrawal. Day-to-day money flows here. | Routine ops never touch the issuer; register can be refilled without risking the mint. |
| **Signing** | The anchor's **ID badge** — signs SEP-10 challenges to prove "I really am this anchor" to wallets. Authentication, not funds. | Auth is a different job from holding money. |

*Deposit in one line:* customer pays INR → **distribution** sends them the token (minted by
**issuer**) → server proved its identity with **signing** throughout.

Each anchor gets its **own** three keys → cryptographic tenant isolation (MizuPay's treasury
≠ Zen's). Testnet keys are disposable (quarterly reset, Friendbot-funded); on mainnet the
same structure holds real value, making issuer-key custody a counsel-level decision.

### What it stacks up, per anchor (verified in `orchestrator.ts`)

A private DB + **four containers** on `nordstern-net`, wired together:

| # | Container | Image | Role / who uses it | Port |
|---|-----------|-------|--------------------|------|
| 0 | `anchordb_<slug>` | postgres | the anchor's own money DB | — |
| 1 | `anchor-platform-<slug>` | `stellar/anchor-platform:latest` | **the engine** — Stellar SEP protocol server (wallets/users) + private Platform API | 8080 / 8085 |
| 2 | `business-server-<slug>` | `nordstern/business-server:dev` | **the anchor's backend brain** — money/KYC/settlement logic | 3000 |
| 3 | `anchor-client-<slug>` | `nordstern/anchor-client:dev` | **customer frontend (USER side)** — Buy/Sell/KYC app | 3001 |
| 4 | `operator-console-<slug>` | `nordstern/operator-console:dev` | **operator frontend (business STAFF side)** — treasury/tx/compliance dashboard | 3001 |

### Correction to a common misconception

There are **two frontends per anchor, and neither is the founder's.** The founder frontend is
**central/shared** (`platform-console`), not per-anchor. Who uses what:

| Audience | Frontend | Where it lives |
|---|---|---|
| **Founder** (business owner onboarding) | `platform-console` `/register`,`/redeem` | **central/shared** (:4001) |
| **NordStern admin** (approves apps) | `platform-console` `/admin` | **central/shared** (:4001) |
| **Anchor operator** (that business's staff) | `operator-console-<slug>` | **per anchor** (built here) |
| **Customer** (end user) | `anchor-client-<slug>` | **per anchor** (built here) |

### The special privilege (and risk)

To create containers on the fly, control-plane is given the **Docker socket**
(`/var/run/docker.sock`) — it can control Docker itself. That's how a program spawns other
containers. It's also the **biggest security surface** in the system (known issue): whoever
controls the Docker socket controls the host's containers. In production this moves to a
safer mechanism (K8s Jobs / brokered API).

**Honest caveat:** the verified E2E confirmed the **AP + business-server** launching;
`provision.ts` persists only their ids. The two frontends (`client`/`console`) are coded and
their images exist, but per-anchor launch has been less consistently confirmed — something to
actually watch when we provision a fresh anchor.

**Verified running:** `curl localhost:3002/health` → `{"ok":true}`.

**What it contributes to:** the entire "become an anchor" promise; encrypted key custody;
multi-tenant isolation at birth (own keys, DB, containers, hostname per anchor).

---

## Step 7 — `aggregator` (:3005, the directory + matchmaker) (auto-started via depends_on)

**What it is:** the **phone book + matchmaker** for anchors. Each anchor runs its money
independently; the aggregator is the one service that knows about *all* of them and can
answer "which anchor should handle this request?" It owns `aggregatordb`. This is the
**"discovery plane"** — it turns many isolated anchors into one routable network.

**Its four jobs:**

1. **Registry** — the list of live anchors: name, web address, supported assets/rails/regions,
   fees, treasury capacity. platform-api registers a new anchor here (`POST /anchors`) once
   control-plane finishes building it.
2. **Health polling** — every ~15s it pings each anchor ("alive? how much treasury?") and
   marks it available or not. *This produced the number we saw:* `total:20, healthy:0` — it
   **remembers** 20 anchors, but since none of their containers are running, every ping fails
   → all 20 marked unavailable.
3. **Quote engine** — given "₹5000 → token via UPI in India," computes a price (fee formula +
   FX rate). FX is a **hardcoded constant** today, not live market (test-plan gap).
4. **Routing engine** — the matchmaker: among *eligible* anchors (right asset/rail, healthy,
   enough treasury) it scores each on **fee / speed / uptime / liquidity**, picks the best,
   and returns a human-readable reason + that anchor's **real SEP endpoints** (the "handoff").

**What it deliberately does NOT do:** it **never touches money.** It only *points* a customer
at the right anchor; the actual deposit/withdrawal happens directly between the customer's
wallet and that anchor. This is what keeps NordStern **non-custodial** and off the money path
— the aggregator is pure discovery/telemetry.

**What we saw:**
```
curl localhost:3005/health
{"status":"up","database":"connected","anchors":{"total":20,"healthy":0,"unhealthy":20}}
```
Live observation: the registry holds 20 anchors (prior provisioning runs + the two demo
seeds `globex`/`acme`), all unhealthy because no anchor stacks are currently running. They
flip to healthy once an anchor is up. (Demo seeds = the `FAIL-SEED-AGG` cleanup item.)

**What it contributes to:** the "network of anchors" vision; a future customer/SDK experience
("find me the best anchor") without the customer knowing anchors exist; NordStern's telemetry
moat — all without ever custodying funds.

---

## Step 8 — `platform-console` (:4001, the founder + admin website)

**What it is:** the **frontend for platform-api** — the Next.js website where humans actually
click. platform-api speaks only JSON; this is its *face*. One app, two surfaces on different
routes; every button calls platform-api behind the scenes.

| Surface | URL | Auth |
|---|---|---|
| **Founder** — apply, sign in, redeem/activate, post-launch home | `localhost:4001/register`, `/login`, `/redeem`, `/overview` | email OTP |
| **NordStern Admin** — review / approve / reject applications | `localhost:4001/admin/login` → `/admin` | username + password |

**Port note:** mapped `0.0.0.0:4001->3000` — inside the container Next.js runs on 3000; we
expose it on **4001** so it doesn't clash with the business-server's 3000.

**What it contributes to:** it's the only human-facing entry point to onboarding — the
founder's whole journey (apply → get approved → activate → watch provisioning → "anchor is
live") and the admin's review queue both live here.

**Gotcha — Compose reconciles the whole dependency graph.** `up -d platform-console` also
showed `platform-migrate ... Exited` again. That's not an error: because everything
`depends_on` the chain, Compose re-checks every dependency and **re-runs the one-shot migrate
job**, which does its "any schema changes?" check (none) and exits 0. Idempotent — safe to
re-run any number of times.

**How we started & verified it:**
```
docker compose --env-file anchor-service/.env.base -f infrastructure/docker/platform.yml up -d platform-console
docker compose ... ps platform-console      # want: Up, 0.0.0.0:4001->3000
# then open a browser:
#   http://localhost:4001/register      (founder wizard)
#   http://localhost:4001/admin/login   (admin panel)
```

---

## Where we are now — the full platform is up

| Layer | Service | Port | Up? |
|---|---|---|---|
| Plumbing | db (postgres) | 5432 | healthy |
| Plumbing | secrets (localstack) | 4566 | healthy |
| Plumbing | traefik | 80 / 8090 | |
| Backend | platform-api | 4000 | |
| Backend | control-plane | 3002 | |
| Backend | aggregator | 3005 | |
| Frontend | platform-console | 4001 | |
| (one-shot) | platform-migrate | — | exited 0 |

**Not yet running:** any **per-anchor stack** (the four containers from Step 6). Those don't
exist until a founder actually **redeems an invite and provisions an anchor** — at which
point control-plane builds them and Traefik starts routing `<slug>.anchors.localhost`. That
is the natural next thing to exercise live: founder applies → admin approves → redeem →
provision → watch the anchor come alive.

---

<!-- Next (live flow): founder apply → admin approve → redeem → provision a real anchor. -->
