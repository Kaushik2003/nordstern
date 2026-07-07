# R6 M2 — CI Foundation: Audit & Design

> Design/review artifact. **No workflows written yet.** Grounded in the actual
> repo at `3580381` (post-M1). Companion to `R6_EXECUTION_PLAN.md`.
> Approve this design before implementation.

---

## Phase 1 — Repository audit

### Method
Read every `package.json` outside `node_modules`, the upstream `anchor-platform/`
clone, and inspected lockfiles, `tsconfig`, `next.config`, `eslint` config,
Dockerfiles, and migration tooling directly. No assumptions of consistency.

### Global facts
- **Package manager: npm everywhere** (each project has its own `package-lock.json`). The one exception, `sep24-reference-ui`, uses **yarn** — it's upstream reference material and is **excluded**.
- **No npm workspaces, no root `package.json`.** Every project is an **independent install** (16 separate `npm ci`s). This shapes the whole CI: no single install, cache per-project by lockfile.
- **No Node version pinned** anywhere except `sep24-reference-ui/.nvmrc` (`>=18`). CI must **standardize the version** → recommend **Node 20 LTS**.
- **No `test` script in any project.** Testing is M3; M2 leaves a graceful slot.
- **Next apps do NOT suppress errors** (`ignoreBuildErrors`/`ignoreDuringBuilds` absent everywhere) → **`next build` is a real TypeScript gate.**
- **Post-M1: zero tracked build artifacts** (`.next`/`dist`/`node_modules` all clean).

### Workspace matrix

Legend: **B**=build, **TC**=typecheck, **L**=lint, **DKR**=Dockerfile. "gate" = how CI verifies correctness for that project.

| # | Workspace | Kind | PM | B | TC | L | DKR | Migrations | Correctness gate | In CI? |
|--:|---|---|---|:--:|:--:|:--:|:--:|---|---|:--:|
| 1 | `platform/api` | Express (tsx, no compile) | npm | – | **Y** | – | Y | **drizzle** (2 `.sql`) | `typecheck` | ✅ blocking |
| 2 | `platform/console` | Next | npm | **Y** | Y | – | – | – | `build` | ✅ blocking |
| 3 | `anchor-service/business-server` | Express | npm | **Y**(`tsc`) | tsc | – | Y | – | `build` (=tsc) | ✅ blocking |
| 4 | `anchor-service/control-plane` | Express | npm | **Y**(`tsc`) | tsc | – | Y | raw SQL (no tool) | `build` (=tsc) | ✅ blocking |
| 5 | `anchor-service/client` | Next | npm | **Y** | tsc | `next lint` | Y | – | `build` | ✅ blocking |
| 6 | `anchor-template/aggregator-service` | Express | npm | **Y** | **Y** | – | Y | – | `build` | ✅ blocking |
| 7 | `anchor-template/business-server` | Express | npm | **Y** | **Y** | – | Y | – | `build` | ✅ blocking |
| 8 | `anchor-template/anchor-client` | Next | npm | **Y** | tsc | `next lint` | Y | – | `build` | ✅ blocking |
| 9 | `anchor-template/client` | Next | npm | **Y** | tsc | cfg, no script | Y | – | `build` | ✅ blocking |
| 10 | `anchor-template/console` | Next | npm | **Y** | **Y** | – | Y | – | `build` | ✅ blocking |
| 11 | `frontend/landing` | Next | npm | **Y** | tsc | `eslint`+cfg | – | – | `build` | ✅ blocking |
| 12 | `frontend/web` | Next | npm | **Y** | tsc | `eslint`+cfg | – | – | `build` | ✅ blocking |
| 13 | `docs-website` | Next (docs) | npm | **Y** | tsc | – | – | – | `build` | ⚠️ non-blocking |
| — | `anchor-service` (root) | `.mjs` setup scripts | npm | – | – | – | – | – | none | ➖ excluded |
| — | `anchor-template` (root) | empty scripts | npm | – | – | – | – | – | none | ➖ excluded |
| — | `sep24-reference-ui` | upstream reference | yarn | Y | – | – | Y | – | — | ➖ excluded (ref) |
| — | `anchor-platform/` | upstream Java clone | gradle | — | — | — | — | — | its own CI | ➖ excluded |

**13 workspaces enter CI** (12 blocking + docs-website non-blocking).

### Per-column findings the audit surfaced
- **build/typecheck:** every CI'd project is coverable — Next apps via `build`, Express services via `build` (their `build` *is* `tsc`), `platform/api` via `typecheck` (it runs on `tsx`, never compiles). So the rule is: **`build` if present, else `typecheck`.**
- **lint: genuinely inconsistent** — `frontend/{landing,web}` have real `eslint` + flat config; `anchor-service/client` & `anchor-template/anchor-client` use `next lint` (no config file); `anchor-template/client` has a config but *no* lint script; consoles have none. → **lint must be non-blocking and skipped where absent.**
- **Docker:** 9 Dockerfiles (rows 1,3,4,5,6,7,8,9,10). Building all 9 per PR is expensive → **separate, path-filtered Docker workflow**, not part of the fast gate.
- **Migrations:** only `platform/api` has a real tool (**drizzle-kit ^0.31.10**, 2 committed migrations). `control-plane` uses raw `CREATE TABLE IF NOT EXISTS` (no tool — that's **M4**, out of scope here). → migration drift check = **platform/api only**.
- **"Currently passes / installs cleanly":** verified `platform/api` `tsc --noEmit` **passes**. The other 12 are **not yet verified end-to-end** — establishing that baseline is precisely the first CI run's job. Expect the first PR to surface a few failures (prototype type slips, `next lint` first-run setup); the plan handles that (see *Blocking vs non-blocking* + rollout).

---

## Phase 2 — CI design

### Guiding decisions
1. **Per-project matrix**, `fail-fast: false` (no workspaces → independent installs; one project failing must not cancel the rest).
2. **Correctness over coverage** for v1: install + build/typecheck are the gate. Lint, audit, docker, docs are non-blocking or separate.
3. **Skip gracefully**: a job step that a project doesn't implement is skipped, never failed (`if hasScript` guard), honoring "don't fail because lint isn't implemented yet."
4. **Small, separate workflows** (four reviewable PRs), not one mega-file. Each reuses a shared **composite setup action** so they never drift.
5. **Reuse existing tooling** — drizzle for drift, `docker build` for images, `next build`/`tsc` for correctness. Invent nothing.

### Four workflows = four PRs

| PR | Workflow | Trigger | Purpose | Blocking? |
|---|---|---|---|---|
| **M2-a** | `.github/workflows/ci.yml` | PR + push | **Quality gate**: install + build/typecheck (matrix) + lint (non-block) | ✅ required |
| **M2-b** | `.github/workflows/security.yml` | PR + push | gitleaks (secret scan) + committed-artifact guard + `npm audit` (non-block) | partial |
| **M2-c** | `.github/workflows/db.yml` | PR touching `platform/api/**` | drizzle migration drift check | ⚠️ soft→hard |
| **M2-d** | `.github/workflows/docker.yml` | PR touching a service's path | `docker build` (no push) per changed image | ⚠️ non-block first |

Plus one shared building block:

- **`.github/actions/setup/action.yml`** (composite): `checkout` → `setup-node@v4` (Node 20, `cache: npm`, `cache-dependency-path` = the project's lockfile) → `npm ci`. Every job in every workflow calls this with a `workspace` input. This is the seam that lets future test/e2e/provisioning jobs slot in without redesign.

### M2-a `ci.yml` — the core gate (shape, not final code)
```
on: [pull_request, push to feature/** and main]
concurrency: cancel-in-progress per ref
jobs:
  quality:
    strategy: { fail-fast: false, matrix: { workspace: [<the 13 dirs>] } }
    steps:
      - uses: ./.github/actions/setup            # checkout+node+cache+npm ci
        with: { workspace: ${{ matrix.workspace }} }
      - run: has build ? npm run build : npm run typecheck   # blocking
      - run: has lint  ? npm run lint : skip                 # continue-on-error
```
`docs-website` is the one matrix entry marked `continue-on-error` (non-blocking).

### M2-b `security.yml`
- **gitleaks** on the **PR diff** (not full history — history holds the known disposable key). Allowlist `frontend/landing/.zshrc ` so the retired file can't perpetually red the pipeline. **Blocking on *new* secrets.**
- **committed-artifact guard** (cheap shell): fail if `git ls-files` matches `\.next/|/dist/|node_modules/|*.tsbuildinfo`. **Blocking** — this keeps M1 enforced forever.
- **`npm audit --audit-level=high`** per project. **Non-blocking** initially (report only); flip to blocking later.

### M2-c `db.yml`
- Path-filter `platform/api/**`. Run `npx drizzle-kit generate` and **fail if it produces an uncommitted migration** (i.e., schema in code drifted from committed SQL). Reuses drizzle; invents no system. **Soft first run → hard once green.**

### M2-d `docker.yml`
- **Path-filtered per image** (only build `business-server` when its context changes, etc.) via `dorny/paths-filter`. `docker build` only, **no push, no registry, no deploy**. **Non-blocking initially** (image builds are the slowest and most environment-sensitive); promote to blocking once stable.

---

## Job dependency graph

```
PR opened / pushed
│
├─ ci.yml ─ quality [matrix × 13]         (parallel; each: setup→build/tc→lint)   ← REQUIRED
│
├─ security.yml
│    ├─ gitleaks (diff)                    ← REQUIRED (new secrets)
│    ├─ artifact-guard                     ← REQUIRED
│    └─ npm-audit [matrix]                 ← non-blocking
│
├─ db.yml ─ drizzle-drift   [if platform/api/**]     ← soft→hard
│
└─ docker.yml ─ build [matrix, path-filtered]        ← non-blocking (v1)
```
No cross-workflow ordering needed — all run in parallel on the same event. Within
a job, steps are linear (setup → gate → lint). Matrix legs are independent.

---

## Runtime estimates (GitHub-hosted `ubuntu-latest`, standard runners)

| Workflow | Parallelism | Per-leg | Wall-clock (warm cache) |
|---|---|---|---|
| `ci.yml` quality | 13 legs in parallel | install 30–75s + build 25–90s | **~3–5 min** |
| `security.yml` | 3 (+audit matrix) | gitleaks ~15s, guard ~5s, audit ~30–60s | **~1–2 min** |
| `db.yml` | 1 | ~45–75s | **~1 min** |
| `docker.yml` | only changed images | 2–5 min/image | **0–5 min** (usually 0–1 image touched) |

Heaviest single install is `frontend/web` (~8k lockfile lines); most are 2–4k.
Concurrency comfortably fits standard runner limits. Target: **green gate in < 5 min**.

---

## Cache strategy

- **npm cache via `actions/setup-node@v4`** with `cache: 'npm'` and
  `cache-dependency-path: <workspace>/package-lock.json` — **keyed per project**,
  since installs are independent. Cache hit ⇒ `npm ci` is dominated by link, not download.
- **(Optional, v1.1) Next build cache**: cache `<ws>/.next/cache` keyed on lockfile + source hash to speed `next build`. Deferred — adds complexity; the npm cache is the big win.
- **No `node_modules` caching** (correctness risk across lockfile changes) — rely on `~/.npm` cache + `npm ci`.
- `concurrency: group=ref, cancel-in-progress=true` so superseded pushes don't pile up.

---

## Matrix strategy

- **One data-driven matrix** (`workspace: [...13 dirs]`) in `ci.yml`, `fail-fast:false`.
- Each leg self-describes what it can run (guarded by "does script X exist"), so
  **adding a project = adding one array entry**; nothing else changes.
- `npm-audit` and `docker` reuse the same list, filtered (audit = all; docker = the 9 with Dockerfiles, path-gated).

---

## Blocking vs non-blocking (v1)

**Blocking (must pass to merge):**
- `npm ci` install (per project)
- `build` / `typecheck` (per project, the 12 blocking workspaces)
- gitleaks on the PR diff (new secrets)
- committed-artifact guard

**Non-blocking (report-only in v1):**
- `lint` (inconsistent tooling — never blocks yet)
- `npm audit` (surface vulns; flip to blocking after a cleanup pass)
- `docs-website` build
- `docker build` validation (promote once stable)
- drizzle drift (soft on introduction → **hard** once the baseline is green)

Rationale: v1 blocks only what is *consistently real and fast* (correctness +
secret/artifact hygiene). Everything noisy or slow starts advisory and graduates.

---

## Phase 3 — Recommended branch protection

For **`main`** (and require the same checks on PRs into the working branch):

- ✅ **Require status checks to pass before merging** → required check: **`quality`** (the `ci.yml` matrix), plus **`gitleaks`** and **`artifact-guard`** from `security.yml`.
- ✅ **Require branches to be up to date before merging** (prevents "green on stale base").
- ✅ **Require a pull request before merging** (no direct pushes to `main`).
- ✅ **Block force pushes** to `main`.
- ✅ **Block deletions** of `main`.
- ⚙️ **Require linear history** (you noted "preferred") — enable; pairs well with squash/rebase merges.
- 🔜 **Require 1 approving review** — you flagged as future; enable when the team grows. Add "dismiss stale approvals" + "require review from code owners" (with a `CODEOWNERS`) at that point.
- ⚙️ Optionally **include administrators** (enforce rules for admins too).

Delivery: I'll provide this as a **GitHub Ruleset JSON** and/or `gh api` commands in
the M2-a PR so you can apply it in one step (branch protection is a GitHub setting,
not a repo file). Non-required checks (audit, docker, docs, drift) stay visible but
don't block.

---

## Phase 4 — Designed for expansion (no future redesign)

The shape below absorbs every later need by **adding jobs/workflows that reuse the
composite setup + the data-driven matrix** — never reworking the pipeline:

- **`test` slot**: `ci.yml` already guards `npm test`; M3 flips it on where present. Money-flow/unit tests land here with zero structural change.
- **Integration / E2E / provisioning tests**: new `integration.yml` / `e2e.yml` reusing `./.github/actions/setup`, triggered by label or schedule (they need Postgres/LocalStack services — added as `services:` blocks). No change to the quality gate.
- **Money-flow tests (M3)**: a dedicated required job once written, gated to money-path packages.
- **Load tests**: separate, manual/scheduled workflow (never on the fast PR path).
- **Kubernetes validation**: an `infra.yml` with `helm lint` + `kubeconform` over `anchor-template/infra/**`, path-filtered — slots beside `docker.yml`.
- **Docker → push**: when R7 needs images in a registry, `docker.yml` gains a `push` step behind a branch/tag condition; build validation logic is unchanged.

Everything hangs off two seams — **the composite setup action** and **the workspace
matrix array** — so growth is additive.

---

## Proposed delivery order (four small PRs)

1. **M2-a** — composite setup action + `ci.yml` quality gate. *(the foundation; establishes the green baseline)*
2. **M2-b** — `security.yml` (gitleaks + artifact-guard + audit).
3. **M2-c** — `db.yml` drizzle drift.
4. **M2-d** — `docker.yml` path-filtered build validation.

Each is independently reviewable/mergeable and green-on-arrival (non-blocking
pieces won't wedge the gate). Branch protection is applied after **M2-a** merges.

**Open the first PR only after this design is approved.**
