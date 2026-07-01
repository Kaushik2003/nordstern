# NordStern — project guidance for Claude Code

The full, canonical project guidance lives in **AGENTS.md** (single source of
truth for every coding agent). Read it before doing anything in this repo:

@AGENTS.md

## Claude Code specifics

- **This is the repo-root guidance.** It applies to the whole `nordstern/` repo:
  `anchor-service/` (the working anchor stack), `frontend/` (brand/landing/console),
  `anchor-platform/` (upstream AP reference), `docs/`.
- **Scoped instructions still apply and win locally.** `frontend/CLAUDE.md`
  covers Cashfree Payments integration work in that subtree and its skills under
  `frontend/.claude/skills/`; `frontend/web/CLAUDE.md` and
  `frontend/landing/CLAUDE.md` cover those Next.js apps. When you're working in
  one of those directories, follow the nearest guidance in addition to this file.
- **Before claiming any payment integration is "production-ready"/"done",** follow
  the go-live gating described in AGENTS.md §7 and the Cashfree skills — surface
  the unmet checklist items instead of declaring readiness.
- Prefer the deep-dive docs in `docs/project/` for architecture, compliance
  questions, and roadmap detail.
