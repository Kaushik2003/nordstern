# Legacy Code Audit — forensic evidence before any deletion

> **Purpose.** Evidence-based classification of every legacy/duplicate/reference candidate,
> so we can delete with **zero chance** of removing something still indirectly used.
> Produced 2026-07-09 by exhaustive search across imports, `package.json`, Dockerfiles,
> `docker-compose*`, Terraform, CI workflows, build/deploy scripts, and docs.
>
> **No code was changed. Nothing was deleted.** This is analysis only.
>
> ## ✅ Phase 2 executed — 2026-07-09 (commit `70955a7`)
> The **entire legacy standalone anchor-service execution path** was retired as one unit
> (Phase-2 forensic search surfaced that `anchor-service/{client,business-server}` were wired
> into the standalone `anchor-service/docker-compose*.yml` + `dev.sh` + AGENTS.md — not just
> orphaned dirs). **Removed (173 files):**
> - `anchor-service/business-server`, `anchor-service/client`  → **Removed** (superseded by `anchor-template/*`)
> - `anchor-service/docker-compose.yml`, `docker-compose.mainnet.yml`, `scripts/setup-mainnet.mjs` → **Removed** (standalone stack; replaced by `docker-compose.platform.yml`)
> - `anchor-template/client` → **Removed** (superseded by `anchor-template/console`)
> - scratch: `anchor-service/chat{,2}.txt`, `anchor-template/KYC_DIDIT{,_DOCS}.txt` → **Removed**
>
> **Kept (canonical):** `anchor-service/control-plane`, `scripts/setup-base` + `setup-testnet`, `config`.
> **De-referenced in lockstep:** `ci.yml` / `security.yml` / `docker.yml`; `dev.sh` rewritten as the
> single canonical launcher; `AGENTS.md` / `README.md` updated to one supported run path.
> **Still pending (Phase 3, product decision):** `frontend/web`, `anchor-platform/`, `sep24-reference-ui/`.
> `mobile/nordpay` kept.

## Method

Searched the whole repo (excluding `node_modules`, `.next`, `.git`, `.terraform`) for each
candidate name, then classified references as **runtime** (compose / prod compose / Terraform
/ the provisioner `orchestrator.ts`) vs **build-only** (CI) vs **documentation**. The decisive
test for "is this live?" is: *does it appear in a runtime config, or is it the source of an
image the provisioner launches?*

### The provisioner's real image sources (the "what replaced it" ground truth)
`anchor-service/control-plane/src/orchestrator.ts` launches four images per anchor:
```
AP_IMAGE      = stellar/anchor-platform:latest      (upstream Docker image)
BIZ_IMAGE     = nordstern/business-server:dev
CLIENT_IMAGE  = nordstern/anchor-client:dev
CONSOLE_IMAGE = nordstern/operator-console:dev
```
Those three `nordstern/*:dev` images are built **exclusively from `anchor-template/*`** — proven by:
- `anchor-service/scripts/dev.sh:30` → `docker build -t nordstern/business-server:dev ../anchor-template/business-server`
- `deploy/README.md:26-28` → business-server / operator-console / anchor-client all from `anchor-template/*`
- `deploy/terraform/DEPLOY_PREP_REVIEW.md:70-72` → same three, all `anchor-template/*`

**Therefore the live anchor stack is built entirely from `anchor-template/`. Nothing in
`anchor-service/business-server`, `anchor-service/client`, or `anchor-template/client` sources
any launched image.**

---

## Summary table

| Candidate | Runtime refs | Built by CI | Reachable by a user | Replacement | Verdict |
|---|---|---|---|---|---|
| `anchor-service/client` | **0** | yes (ci/docker/security) | **No** | `anchor-template/anchor-client` | **SAFE TO DELETE** |
| `anchor-service/business-server` | **0** | yes | **No** | `anchor-template/business-server` | **SAFE TO DELETE** |
| `anchor-template/client` | **0** | yes | **No** | `anchor-template/console` | **SAFE TO DELETE** |
| `frontend/web` ("Keel") | **0** | yes | **No** | (design source only) | **DEPRECATE** |
| `anchor-platform/` | **0** (CI-excluded) | **no** | No | upstream on GitHub | **KEEP AS REFERENCE** * |
| `sep24-reference-ui/` | **0** (CI-excluded) | **no** | No | upstream on GitHub | **KEEP AS REFERENCE** * |
| `mobile/nordpay` | **0** | no (not a CI workspace) | No | (future mobile app) | **DO NOT DELETE** |
| scratch `.txt` dumps | 0 | no | No | — | **SAFE TO DELETE** |

\* The user has indicated a preference to **delete** the two upstream clones for repo
cleanliness. That is defensible (they live on GitHub upstream; the MVP runs the *Docker image*
`stellar/anchor-platform:latest`, not this source) — see each entry's risk note. Classified
"KEEP AS REFERENCE" on pure forensic grounds (they are intentional study material per
`AGENTS.md §8`); the delete decision is a product/readability call, not a correctness one.

---

## 1 · `anchor-service/client`

**1. References (every one, outside its own dir):**
- Docs: `README.md:177,749` (labelled "legacy"), `docs/project/CURRENT_STATE.md:121`,
  `R6_M2_SUMMARY.md:14`, `R6_M2a_BASELINE.md:14,60`, `R6_M2_CI_DESIGN.md:34,52`
- CI: `.github/workflows/security.yml:102`, `docker.yml:42`, `ci.yml:44`
- docs-website (Antigravity WIP): `content/docs/getting-started/local-setup.mdx:45`
- **Runtime (compose/prod/terraform/orchestrator): `0`.**

**2. Built?** CI only — `ci.yml` (tsc/build), `security.yml` (lint), `docker.yml` (image
build validation). **Not** built by `docker-compose.platform.yml`/`prod`, **not** the source
of `nordstern/anchor-client:dev` (that's `anchor-template/anchor-client`). Vercel: no. Terraform: no.

**3. Reachable?** **No.** No compose service, no provisioner launch, no host/route. No founder/
admin/operator/customer path reaches it. Proof: 0 runtime refs; the launched customer app image
is built from `anchor-template/anchor-client`.

**4. Duplicated functionality?** Yes → replaced by **`anchor-template/anchor-client`** (the
native customer app the provisioner actually launches as `nordstern/anchor-client:dev`).
`README.md:177` states it outright: *"Original Phase-0 anchor MVP — superseded by
`anchor-template/*`."*

**5. Could deleting break anything?**
- CI: **yes, if not updated in lockstep** — remove it from `security.yml` WORKSPACES,
  `docker.yml` matrix, `ci.yml` matrix. Trivial edits; otherwise those jobs error on a missing dir.
- Local dev / provisioning / deploy / Terraform / migrations / tests: **no** (0 runtime refs;
  `tests.yml` only runs `anchor-template/business-server` + `platform/api`).
- Docs: several historical audit docs mention it; they're point-in-time records, harmless.

**6. Recommendation: SAFE TO DELETE** (with the CI edits above). Superseded, unreachable,
zero runtime coupling.

---

## 2 · `anchor-service/business-server`  *(newly identified)*

**1. References:** CI (`docker.yml:41`, `security.yml:102`), docs (`README.md:177`,
`CURRENT_STATE.md`). **Runtime: `0`.** Note: `anchor-service/control-plane` (its sibling) **IS**
built by compose (`docker-compose.platform.yml:60 build: ./anchor-service/control-plane`) — so
**`anchor-service/` is not wholly legacy**; only `business-server` and `client` under it are.

**2. Built?** CI only. The launched `nordstern/business-server:dev` is built from
**`anchor-template/business-server`** (`dev.sh:30`), not this dir.

**3. Reachable?** **No** — 0 runtime refs; not the source of the launched image.

**4. Duplicated functionality?** Yes → **`anchor-template/business-server`** (the money-safe
USDC server with the outbox, at-most-once payout, DIDIT KYC — the one actually deployed).

**5. Could deleting break anything?** Same as #1: **CI edits required**; no runtime/deploy/
provisioning impact. ⚠️ Do **not** confuse with `anchor-service/control-plane` or
`anchor-service/scripts` — those are **canonical** (the real provisioner + setup) and must stay.

**6. Recommendation: SAFE TO DELETE** (delete `anchor-service/business-server` only; keep
`control-plane`, `scripts`, `config`).

---

## 3 · `anchor-template/client`

**1. References:** Docs (`README.md:178,675,746` "legacy prototype", `CURRENT_STATE.md:121,315`,
`ROADMAP.md:16`, `IMPLEMENTATION_AUDIT.md:154`, `R6_*`), CI (`security.yml:104`, `ci.yml:48`
with `--legacy-peer-deps`, `docker.yml:47`), docs-website WIP
(`content/docs/anchor/operator-console.mdx:8,51-53` — **Antigravity incorrectly documents this
as the current operator console; it is not**). **Runtime: `0`.**

**2. Built?** CI only (and slow — `R6_M2_SUMMARY.md:37` notes it's the slowest CI build at 2m1s).
Not compose, not the source of `nordstern/operator-console:dev` (that's `anchor-template/console`).

**3. Reachable?** **No.** The operator console the provisioner launches is
`nordstern/operator-console:dev`, built from `anchor-template/console` (`deploy/README.md:27`).

**4. Duplicated functionality?** Yes → **`anchor-template/console`** (the 14-module operator
console, verified live this session on `console-<slug>...`). `README.md:178`: *"Earlier customer
dashboard prototype (faker/next-auth) — superseded by `anchor-client`."* (Note the README even
mislabels its replacement; the **operator** replacement is `console`, the **customer** one is
`anchor-client` — either way, `client` is dead.)

**5. Could deleting break anything?** CI edits required (same three files). ⚠️ **docs-website
(Antigravity) currently references it as current** — coordinate: either let Antigravity finish
and correct its operator-console page, or note the stale reference. No runtime/deploy impact.

**6. Recommendation: SAFE TO DELETE** (after aligning the in-flight docs-website reference).

---

## 4 · `frontend/web` ("Keel")

**1. References:** Docs extensively as a **prototype/design source** — `README.md:176,675,746`,
`AGENTS.md:241`, `CLAUDE.md:15`, `ARCHITECTURE.md:31,162` (*"Demo console visuals → frontend/web
per frontend/PRD.md"*), `CURRENT_STATE.md:102,315,457,594`, **`ROADMAP.md:40` — "Keel UI
Convergence: migrate the premium dashboard layouts/bento screens/styles from `frontend/web/`"**,
`IMPLEMENTATION_AUDIT.md:129`. CI (`security.yml:105`, `ci.yml:51`). **Runtime: `0`.**

**2. Built?** CI only (heaviest install, `R6_M2_CI_DESIGN.md:139`). Not compose, not deployed,
not Vercel (only `frontend/landing` is on Vercel).

**3. Reachable?** **No** — synthetic/faker data, not wired to any backend
(`CURRENT_STATE.md:594`). No user path.

**4. Duplicated functionality?** Partial — it is a *higher-fidelity visual prototype* of the
operator console; the **functional** replacement is `anchor-template/console`, but `frontend/web`
is explicitly earmarked as the **design reference to migrate FROM** (`ROADMAP.md:40`). So it is
not pure dead code — it has residual value as a design source.

**5. Could deleting break anything?** No runtime/deploy/CI-correctness impact (just remove from
the two CI lists). **But** you'd lose the design source the roadmap says to migrate from, and
`frontend/PRD.md` + `frontend/.claude/skills` reference it.

**6. Recommendation: DEPRECATE** (leave temporarily). Not deployed and safe to remove
mechanically, but it still has cited design value (ROADMAP "Keel convergence"). Delete only once
that convergence is done or explicitly abandoned. If the readability goal outweighs the design
reference, downgrade to SAFE TO DELETE — a product call, not a correctness one.

---

## 5 · `anchor-platform/`  (upstream Stellar clone, 1,127 tracked files)

**1. References:** **Explicitly excluded from CI** — `docker.yml:10` *"reference images
(sep24-reference-ui, anchor-platform) are excluded"*, `ci.yml:13` *"Excluded (upstream, not
ours): anchor-platform/, sep24-reference-ui/."* Docs: `AGENTS.md §8` (reference/study material).
**Runtime: `0`.** *(Note: `stellar/anchor-platform:latest` in compose is the published Docker
**image**, completely unrelated to this source dir.)*

**2. Built?** **No** — CI-excluded, not in any compose/Terraform.

**3. Reachable?** **No** — it's source for study only.

**4. Duplicated functionality?** It **is** the upstream product; the MVP consumes it as a Docker
image, not this source. So it's not "duplicated" — it's reference material.

**5. Could deleting break anything?** **No** functional impact (nothing builds/runs it). Risks
are only: (a) losing in-repo study material (`AGENTS.md §8` points people here to learn SEP/AP
config); (b) it lives upstream on GitHub, so it's recoverable. Note it carries its own
`.agents/skills/` (e.g. `didit-aml-screening`) — verify nothing local depends on those before
removing.

**6. Recommendation: KEEP AS REFERENCE** on forensic grounds — *but* deleting is a legitimate
**readability** choice (1,127 files of non-authored code obscure what you built, and it's one
click away on GitHub). If prioritizing a clean judged repo: **SAFE TO DELETE** after confirming
nothing local imports its `.agents/skills`. **User has indicated: delete.**

---

## 6 · `sep24-reference-ui/`  (upstream Stellar reference wallet)

**1. References:** CI-excluded (`docker.yml:10`, `ci.yml:13`), docs `AGENTS.md §8`. Runtime: `0`.
Has its own `Dockerfile` + `package.json` (it's a standalone upstream app).
**2. Built?** No (CI-excluded). **3. Reachable?** No. **4. Duplicated?** Upstream reference, not
ours. **5. Break risk?** None functional; same reference-material caveat as #5.
**6. Recommendation: KEEP AS REFERENCE** (forensic) / **SAFE TO DELETE** (readability call).
**User has indicated: delete.**

---

## 7 · `mobile/nordpay`  (discovered — Expo/React-Native app)

**1. References:** **Self-contained** — only its own files + docs (`log.md`, `decisions.md`,
a `2026-07-06` implementation plan). **0** references from the rest of the repo. Not in any CI
workspace list, compose, Terraform, or orchestrator.
**2. Built?** No (not a CI workspace; separate `bun.lock`). **3. Reachable?** No (not deployed).
**4. Duplicated?** No — it's a *new* native mobile wallet prototype (mock data), no equivalent
elsewhere. **5. Break risk?** Deleting removes an in-progress mobile app (recent decisions log
dated 2026-07-06) — likely active work, not legacy.
**6. Recommendation: DO NOT DELETE.** It's isolated and unfinished, not legacy. Leave it (or move
under a clearly-labelled `prototypes/` later if desired).

---

## 8 · Scratch / throwaway files

`anchor-template/KYC_DIDIT.txt`, `anchor-template/KYC_DIDIT_DOCS.txt`,
`anchor-service/chat.txt`, `anchor-service/chat2.txt` — raw notes/chat dumps, referenced nowhere,
built by nothing. **Recommendation: SAFE TO DELETE.** (Also `docs-website/FINDINGS.md` and the two
`ANTIGRAVITY_*` prompt files are working artifacts of the in-flight agent tasks — leave those
until `sdk/` and `docs-website/` are done.)

---

## Cross-cutting finding: CI is already STALE (fix regardless of deletions)

The console split (`platform/console` → `founder-console` + `admin-console`) is **not reflected
in CI**:
- `ci.yml:41` and `security.yml:101` still list **`platform/console`** — a directory that **no
  longer exists** → those jobs reference a missing workspace.
- **`platform/founder-console`, `platform/admin-console`, `platform/shared-ui`,
  `platform/shared-auth` appear in NO workflow** → the two shipped apps + shared packages are
  **not built/linted/typechecked by CI at all**.

**This must be fixed** whether or not we delete anything: update `ci.yml`, `security.yml`,
`docker.yml` to drop `platform/console` (+ any deleted legacy dirs) and add the four new
`platform/*` workspaces. Otherwise CI is validating a codebase that doesn't match reality.

---

## Recommended sequencing (no action taken here)

1. **Fix CI drift first** (independent of deletions): swap `platform/console` → the four new
   `platform/*` workspaces across `ci.yml` / `security.yml` / `docker.yml`.
2. **Delete the clear dead code** (`anchor-service/client`, `anchor-service/business-server`,
   `anchor-template/client`, scratch `.txt`s) **and remove them from CI in the same commit** so
   CI never references a missing dir.
3. **Reference clones** (`anchor-platform/`, `sep24-reference-ui/`): delete per the readability
   goal (user preference) after confirming no local dependency on their `.agents/skills`.
4. **`frontend/web`**: DEPRECATE for now (design source per ROADMAP); revisit post-demo.
5. **`mobile/nordpay`**: keep.
6. **Do NOT** rename/move load-bearing dirs (`platform/*`, `anchor-service/control-plane`,
   `anchor-template/{business-server,aggregator-service,anchor-client,console,config}`, `deploy/`)
   before the demo — that breaks compose build contexts + the deploy checklist. Defer structural
   renames to post-demo.
7. **Do NOT** touch `sdk/` or `docs-website/` — Antigravity is mid-flight there.
