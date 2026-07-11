# NordStern — project guidance for Claude Code

The full, canonical project guidance lives in **AGENTS.md** (single source of
truth for every coding agent). Read it before doing anything in this repo:

@AGENTS.md

## Claude Code specifics

- **This is the repo-root guidance.** It applies to the whole `nordstern/` repo:
  `anchor-service/control-plane` (the provisioner), `anchor-template/` (the anchor
  stack), `platform/` (the SaaS + consoles), `apps/` (landing, docs, consoles, mobile),
  `packages/design-system/` (brand + design system), `infrastructure/` (docker, aws,
  scripts), and `docs/`.
- **Scoped instructions still apply and win locally.** `packages/design-system/CLAUDE.md`
  covers Cashfree Payments integration work in that subtree and its skills under
  `packages/design-system/.claude/skills/`; `apps/landing/CLAUDE.md` covers the landing app.
  When you're working in one of those directories, follow the nearest guidance in
  addition to this file.
- **Before claiming any payment integration is "production-ready"/"done",** follow
  the go-live gating described in AGENTS.md §7 and the Cashfree skills — surface
  the unmet checklist items instead of declaring readiness.
- Prefer the deep-dive docs in `docs/` for architecture, compliance
  questions, and roadmap detail.
