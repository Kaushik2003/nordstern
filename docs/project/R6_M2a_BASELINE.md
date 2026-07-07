# R6 M2-a — First CI run: baseline audit

> Run: **#28855805056** (PR #2, `pull_request` trigger, Node 22, commit `eed430e`).
> Goal was **truth, not green**. CI executed correctly and surfaced real debt.

## Result: 11/13 blocking legs pass, 2 fail, gate correctly RED

| Job | Result | Notes |
|---|:--:|---|
| quality (platform/api) | ✅ | typecheck |
| quality (platform/console) | ❌ | **build fails — /redeem prerender** |
| quality (anchor-service/business-server) | ✅ | build (tsc) |
| quality (anchor-service/control-plane) | ✅ | build (tsc) |
| quality (anchor-service/client) | ✅ | build; lint failed (non-blocking) |
| quality (anchor-template/aggregator-service) | ✅ | build |
| quality (anchor-template/business-server) | ✅ | build |
| quality (anchor-template/anchor-client) | ✅ | build; `--legacy-peer-deps` worked; lint failed (non-blocking) |
| quality (anchor-template/client) | ✅ | build; `--legacy-peer-deps` worked |
| quality (anchor-template/console) | ✅ | build |
| quality (frontend/landing) | ❌ | **npm ci fails — stale lockfile** |
| quality (frontend/web) | ✅ | build |
| quality (docs-website) | ✅ | non-blocking leg, passed anyway |
| **ci-required** | ❌ | correct — 2 blocking legs failed |

No jobs were skipped entirely. `lint`/`typecheck` steps skip gracefully where absent (as designed); `docs-website` non-blocking behaved as designed.

---

## Failures (each fully root-caused)

### F1 — `platform/console` build fails
- **Workspace / job / step:** `platform/console` · quality · `npm run build` (Next 16.2.10, Turbopack)
- **Exact error:**
  ```
  ⨯ useSearchParams() should be wrapped in a suspense boundary at page "/redeem".
  Error occurred prerendering page "/redeem".
  Export encountered an error on /(auth)/redeem/page: /redeem, exiting the build.
  ⨯ Next.js build worker exited with code: 1
  ```
- **Root cause:** `platform/console/app/(auth)/redeem/page.tsx:41` calls `useSearchParams()` in a page Next tries to **statically prerender**, with **no `<Suspense>` boundary and no `export const dynamic = 'force-dynamic'`**. Next's static export bails out. TypeScript passed; this is a *prerender/runtime* build constraint. The production build of this app has been broken — locally we only ran `dev`/`typecheck`, never `next build`, so it slipped until now.
- **Classification:** **Category B — genuine code issue.** Type = **Code issue** (real broken build, not cosmetic). Fix is small (wrap the consumer in `<Suspense>` **or** mark the page `force-dynamic`), but it's a real defect, not prototype debt to ignore.

### F2 — `frontend/landing` install fails
- **Workspace / job / step:** `frontend/landing` · quality · `npm ci`
- **Exact error:**
  ```
  npm error Missing: p-locate@3.0.0 from lock file
  npm error Missing: path-exists@3.0.0, p-limit@2.3.0, p-try@2.2.0,
                     mimic-function@5.0.1, glob-parent@5.1.2, ansi-regex@6.2.2 ...
  ```
- **Root cause:** `frontend/landing/package-lock.json` (lockfileVersion 3) is **out of sync** with the resolved dependency tree — missing transitive entries the deps require. `npm ci` is strict and refuses an inconsistent lockfile (this is exactly what `npm ci` is *for*). Sibling `frontend/web` is fine, so it's isolated to this project's lockfile.
- **Classification:** **Category B — genuine dependency issue.** Type = **Dependency issue** (broken lockfile → project not reproducibly installable). Fix = regenerate the lockfile (`npm install` in `frontend/landing`, commit the updated `package-lock.json`). Small but real.

---

## Non-fatal observations (no job failed on these)

| # | Observation | Category | Action |
|---|---|---|---|
| O1 | **Non-blocking lint failed** on `anchor-service/client` and `anchor-template/anchor-client` (`next lint`, `continue-on-error`). Jobs still passed. `next lint` is also deprecated in Next 15/16. | **C — intentional (lint deferred)** | Leave non-blocking now; address lint tooling in a later pass. |
| O2 | **Node 20 deprecation warning** — `actions/checkout@v4` + `actions/setup-node@v4` target Node 20; runner forced them to Node 24. Our *project* Node (22) is separate and unaffected. | **C — informational (upstream)** | None now; bump action majors when released. Not an error. |
| O3 | **`git ... exit code 128` / `No url found for submodule 'mobile/SwiftBasicPay'`** in every job's POST-cleanup. **No `.gitmodules`, gitlink, or SwiftBasicPay exists in our tree or on disk** — external to our code, occurs after the job concludes, affects nothing. | **C — informational (runner noise)** | Flag for later curiosity; not blocking, not masking anything. |

---

## Classification summary

- **Category A — CI bug:** **NONE.** The workflow is correct. It caught 2 real failures, masked nothing, `fail-fast:false` let every leg report independently, per-workspace `--legacy-peer-deps` worked (both legs green), non-blocking lint/docs behaved as designed, and `ci-required` correctly went red. **Architecture is sound.**
- **Category B — genuine issues (2):** F1 `platform/console` broken build; F2 `frontend/landing` stale lockfile. Both are real, both are small, neither is masked.
- **Category C — intentional/informational (3):** O1 lint deferred, O2 upstream Node warning, O3 runner submodule noise.

## Success criteria (M2-a)

| Criterion | Met? |
|---|:--:|
| GitHub Actions executes | ✅ |
| Complete baseline across all workspaces | ✅ (all 13 ran) |
| Every failure understood & classified | ✅ (F1, F2 root-caused) |
| No unknown failures | ✅ (all ❌ and every warning explained) |
| Workflow architecture sound | ✅ (zero Category A) |

**The gate is red because two apps genuinely cannot build/install — that is the correct, truthful signal.** We fix these deliberately (not by weakening CI). Recommendation: fix both now as two tiny, separate commits (they mean `platform/console` can't build and `frontend/landing` can't install today), then the gate goes green and branch protection can be applied. Alternatively, schedule them — your call.
