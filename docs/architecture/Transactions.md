# ADR-0001 — Customer transaction history across multi-tenant anchors

**Status:** Proposed · **Date:** 2026-07-08 · **Decision owner:** NordStern platform

## Context

NordStern now has: a **central customer identity** (platform-api: `customers`, `customer_wallets`,
KYC), **multi-tenant anchors** (each its own stack), **per-anchor business databases**
(`anchordb_<slug>`: the Anchor Platform's SEP-24 transactions + the business-server's
`nordstern.*` money tables — `deposit_releases`, `withdrawal_payouts`, `audit_logs`, …), and
**wallet-linked customers** (a customer links Stellar addresses; transactions are keyed by the
Stellar account that authenticated via SEP-10).

The customer app must show a customer their history. A customer may transact across **multiple
anchors**, and we expect to host **hundreds–thousands of anchors**. Two forces:
1. **Money truth must stay in the anchor.** The anchor is the operator/record-holder; NordStern
   is infrastructure, not a custodian (consistent with [settlement model] and §5 compliance).
2. **A customer's history is inherently cross-anchor** and keyed by identity, not by anchor.

Constraint discovered earlier: a customer's SEP-24 transactions can only be listed *from an
anchor* with a per-wallet SEP-10 signature — so "query the anchor live, per wallet" is both
slow and UX-hostile at read time. Also relevant: the AP's own event stream is **disabled**
(`events.enabled: false`) in the MVP, so the **business-server is the event source**.

The explicit concern to honor: **do not introduce a second source of truth.**

## Options

### Per-dimension analysis

| Dimension | **A — per-anchor only** | **B — central write table** | **C — read-model/index (CQRS)** |
|---|---|---|---|
| **Source of truth** | Anchor DB (single) | **SPLIT** — anchor *and* central copy (two truths) | Anchor DB (single); index is a **derived projection**, not a truth |
| **Scalability** | Excellent — no central path | Poor — central **write hotspot** on every anchor's every event; SPOF | Good — async projection off the write path; index is shardable/rebuildable |
| **Multi-anchor** | **Poor** — customer sees only the current anchor | Good — naturally aggregated | **Excellent** — aggregated by customer via wallet-link |
| **Consistency** | Perfect (live, single source) | **Weak** — classic dual-write drift | Eventual for the *view*; money truth always exact; drift self-heals by re-projecting |
| **Failure modes** | Anchor down → no history (inherent) | Central down → **lost/partial events across ALL anchors**; ordering/dedupe bugs | Index down/stale → history stale but **money unaffected**; rebuildable; can fall back to live anchor query |
| **Operational complexity** | Lowest | High — every anchor hard-depends on central store for writes; retries/backfill/reconcile | Moderate — ingestion + index + rebuild tooling, but decoupled from money writes |
| **Compliance (§5)** | Cleanest — each anchor holds its own records; per-anchor residency | **Riskiest** — NordStern becomes controller of aggregated financial records across independent regulated entities | Middle — a *derived, minimal, consented, deletable* view; anchors remain record-holders; still needs "where permitted" scoping + counsel |
| **Demo quality** | OK single-anchor; weak cross-anchor story | Great | **Great** — fast unified history |
| **Long-term maintainability** | High, but doesn't deliver the cross-anchor value prop | **Low** — dual-write anti-pattern, coupling, drift | Good — projection isolated; zero business logic in the index; anchors own all rules |

### The key distinction the concern turns on
- **Option B introduces a second source of truth** (a central copy anchors must keep in sync) →
  the dual-write anti-pattern, drift, coupling, compliance exposure. **Reject.**
- **Option C introduces a derived read-model** — a rebuildable projection that is *not* a source
  of truth. This is the standard CQRS answer and precisely avoids the concern.
- **Option A** is correct but incomplete: it can't show cross-anchor history and forces
  per-wallet SEP-10 at read time.

### Option D — recommended: **C, done correctly (transactional outbox + CQRS read-model)**

C, made reliable and precise:

1. **Anchors stay authoritative.** No change to how money is recorded.
2. **Transactional outbox in the business-server.** On each customer-relevant lifecycle change
   (buy/sell initiated / payment received / completed / failed), the business-server appends an
   event row **in the same local DB transaction** as the state change. This is **not** a dual
   write — it is one local transaction; publication is separate and idempotent. (The
   `deposit_releases`/`withdrawal_payouts`/`audit_logs` tables already prove this pattern here.)
3. **A central indexer** (extend the existing aggregator, or a small new service) consumes those
   events — pull each anchor's outbox, or push to a bus later — and writes a
   **`customer_transactions` read-model** keyed by `customer_id`, resolved via the
   `customer_wallets` address → customer link.
4. **The read-model stores only references**, never authoritative money data: `customer_id`,
   `anchor_slug`, `kind`, `amount`, `status`, `reference`, timestamps, `anchor_tx_id` (a pointer).
   No KYC/PII beyond the minimum. It is **disposable and rebuildable** from the anchors' outboxes.
5. **The customer app reads history from the index** (fast, cross-anchor, no per-wallet SEP-10).
   For one transaction's live detail it can deep-link to the authoritative anchor.
6. **Graceful degradation:** index stale/down → show "recent activity may be delayed" and/or
   query the current anchor live; money is never affected.

Why D over plain C: the **outbox** removes the reliability gap (no lost events, no dual-write),
and the **reference-only, rebuildable** framing keeps it unambiguously a read-model, not a truth.

## Decision

**Adopt Option D (transactional-outbox-fed CQRS read-model). Reject B (second source of truth).**

**Phasing (so we don't over-build for the pilot):**
- **Now (pilot, few anchors, little cross-anchor overlap):** ship **Option A** behaviour — the
  customer app shows the current anchor's history (honest empty until a buy/sell lands). No new
  storage. This is a *subset* of D (querying one anchor = the trivial index), so it is **not
  throwaway** and introduces no second truth.
- **When multi-anchor customer overlap is real (or before a multi-anchor demo):** add the
  business-server outbox + the central indexer + the `customer_transactions` read-model. Backfill
  by projecting existing anchor records.

## Consequences

- **Positive:** anchors stay the single source of money truth; cross-anchor history without a
  second truth; scales to thousands of anchors (async, decoupled, rebuildable); solves the
  read-time SEP-10 problem; supports the "one identity, verify/transact across anchors" value prop.
- **Negative / to manage:** eventual consistency of the *view* (mitigated by outbox + "syncing"
  UX); an indexer + read-model to operate; idempotent, ordered event handling.
- ** Compliance (§5) — flag for counsel before building the central index:** aggregating a
  customer's activity **across independent anchors** into a NordStern-held view may itself be a
  regulated data activity and raises data-controller/residency questions — even as a derived
  model. Mitigate by: storing the **minimum** (references, not full records), honoring per-anchor
  **"where permitted"** sharing (same caveat as shared-KYC), and making the index **deletable per
  customer**. Add to `COMPLIANCE_OPEN_QUESTIONS.md`.

## Not doing
- **No implementation now** (per request). The pilot continues on Option-A behaviour; the read-
  model is built when multi-anchor overlap justifies it, following this ADR.
