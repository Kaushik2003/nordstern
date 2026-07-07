# Branch protection — apply after M2-a merges

Branch protection is a GitHub *setting*, not a repo file, so it can't ship in the
workflow itself. Apply the ruleset below to `main` once `ci.yml` has run at least
once (so the check name `ci-required` is registered as selectable).

## Required status check

Required checks (add each as it lands):
- **`ci-required`** — aggregation job in `ci.yml`; green only when every *blocking*
  workspace passes (`docs-website` is non-blocking and cannot fail it).
- **`secret-scan`** — gitleaks (M2-b); blocks on a genuine new secret in the PR range.
- **`hygiene`** — committed-build-artifact guard (M2-b); blocks on tracked generated files.

`dependency-audit` (M2-b) is **advisory / non-blocking** — do NOT add it as required.

## Option A — GitHub UI
Settings → Rules → Rulesets → New branch ruleset, target `main`:
- ✅ Require a pull request before merging
- ✅ Require status checks to pass → add **`ci-required`**
- ✅ Require branches to be up to date before merging
- ✅ Block force pushes
- ✅ Restrict deletions
- ✅ Require linear history
- 🔜 Require 1 approving review (enable when the team grows; add CODEOWNERS + dismiss stale approvals then)

## Option B — `gh` CLI (ruleset)
```bash
gh api -X POST repos/Kaushik2003/nordstern/rulesets \
  --input .github/rulesets/main-protection.json
```

The ruleset JSON lives at `.github/rulesets/main-protection.json`.
