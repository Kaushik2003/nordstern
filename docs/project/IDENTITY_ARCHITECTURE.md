# NordStern Customer Identity — Architecture Decision Record

> Status: **Accepted (design)** · Owner: founders + architecture · Last updated: 2026-07-10
>
> This ADR defines the customer identity layer for NordStern. It is the stable design the
> team builds against. It supersedes ad-hoc identity assumptions in the code. Deep review and
> the reasoning behind it live in the conversation that produced it; this file is the durable
> conclusion. Related decisions: `nordstern-customer-identity`, `nordstern-settlement-model`,
> `nordstern-passkey-smart-wallets`, `nordstern-kyc-didit-universal`, and the open legal
> questions in `COMPLIANCE_OPEN_QUESTIONS.md` (§5).

## 1. Thesis

The customer is a **person**, represented by a first-class **NordStern Identity**. A wallet is a
**capability** that person attaches by **proving ownership**. Money moves only with a **fresh
cryptographic proof**. Nothing about who the customer *is* depends on any single key.

NordStern is the identity provider; anchors **receive permission** to use a customer's identity.
The customer owns exactly one NordStern Identity and carries it across every anchor.

## 2. The model

```
Customer (the person)
   └── NordStern Identity            ← first-class, portable, the root of truth
         ├── Credentials
         │     ├── Authenticators        → email OTP, passkey, phone OTP, OAuth   (open a session)
         │     └── Signing capabilities  → external wallet, embedded/passkey wallet (authorize value)
         ├── KYC                          → the person's verified-human claim (verified once)
         └── Consent grants (per anchor)  ← the legal containment boundary
                └── Anchor (Mizu / Orbita / Solaris / …)
                      └── Transactions    → isolated per anchor, scoped to PROVEN wallets
```

**Source of truth:** the internal `customer_id` (the NordStern Identity). Email is the primary
**login credential** and recovery anchor. DIDIT is the **verified-human** claim. Wallets are
**proven, revocable capabilities** — never identity.

## 3. Principles (the hard rules)

1. **A wallet grants zero capability until ownership is cryptographically proven** (a signed
   challenge — SEP-10-style nonce → wallet signs → verify → record the proven bond). Applies to
   *linking*, not only to *paying*. The `(customer, wallet)` bond is globally unique — a wallet
   belongs to at most one identity.
2. **The person is `customer_id`.** Email = login; DIDIT = verified-human; wallets = proven
   attachments. Nothing downstream keys off a wallet as identity.
3. **Not every credential can start a session.** Authenticators (email/passkey/phone/OAuth) open
   sessions. Signing capabilities (external/embedded wallets) authorize value. **An external
   wallet is never a login credential** (that reintroduces wallet = identity + key-theft
   takeover). Embedded/passkey wallets may be both, *because the identity provisions them*.
4. **Three authorization tiers** (see §4). Reads by session; value by wallet proof; sensitive
   changes by step-up.
5. **Ownership proof is durable for low-risk reads but re-verifiable on risk** (see §5).
6. **KYC belongs to the person; sharing it to an anchor is an explicit, revocable consent
   grant** (see §6). No silent cross-anchor import.
7. **Capabilities are shared at the identity layer; data/history is isolated at the anchor
   layer.** A wallet (key) can be used across anchors; an anchor never sees another anchor's
   transactions to it.

## 4. Authorization — three tiers

| Tier | Proof | Authorizes |
| --- | --- | --- |
| **L1 — Session** | Email OTP → session cookie | Login, browse, read *own* data, edit non-sensitive settings, start KYC |
| **L2 — Wallet proof** | Fresh signed challenge from the wallet | Buy, sell, receive settlement, **link a wallet** |
| **L3 — Step-up** | Fresh OTP **or** fresh wallet signature | Change email, remove/replace wallet, revoke KYC consent, delete account, transfer embedded-wallet ownership |

The business server trusts the **platform session for reads** and independently requires a
**wallet signature for value** — never one standing in for the other. Session theft yields reads
only; it cannot move money.

## 5. Wallet ownership — proof and re-verification

- **Proof at link time:** server issues a nonce → wallet signs → server verifies → a durable
  proven bond is recorded (`proven_at`, nonce, signature/tx). Unproven links grant nothing.
- **Re-verification is risk-triggered, not time-triggered.** Proof is durable for low-risk reads.
  Fresh proof is demanded on: any L3 action; settlement above a threshold; a new device/IP after
  dormancy; or after an email change. Time (staleness) is one *input* to the risk score, not the
  rule. Re-authing to merely *view* history is a non-goal.

## 6. KYC — ownership and consent

- **The verification belongs to the person** (one `customer_kyc`, DIDIT session + status).
- **An anchor may see/trust it only via a per-anchor consent grant** (`anchor_kyc_consents`,
  grant/revoke, logged). `centralKycApproved` checks **consent**, not just status.
- Reuse is **"verify once, reuse with consent, revocably"** — not automatic. Declining consent
  re-verifies for that anchor. This consent table **is** the legal containment boundary that
  keeps NordStern (the data controller) from being liable for anchors' misuse; it ships *with*
  the identity layer, not after it.

## 7. Transactions

History belongs to the **(customer, anchor)** tuple. Storage stays per-anchor (`anchordb_<slug>`).
Visibility is scoped to the customer's **proven** wallets only — never mere linked addresses.
No cross-anchor visibility by default, even for a shared wallet.

## 8. Recovery

Because identity = email + KYC (not a key), losing a wallet is **not** losing the account:
link a new wallet (prove ownership) → revoke the old → history re-associates to the person. Email
compromise is the real risk; L3 step-up + re-proof on sensitive actions contains it.

## 9. Threat model (summary)

- **History snooping via address linking** → killed by Rule 1 (proof to link).
- **KYC/identity theft by claiming a verified wallet** → killed by globally-unique proven bond +
  consent-gated reuse.
- **Session theft** → reads only; value needs wallet signature; L3 needs step-up.
- **Lost/stolen key** → identity survives; re-proof required to re-link; two factors kept separate.
- **Malicious anchor operator** → sees only what the customer consented to; per-anchor isolation.
- **Challenge replay** → nonce + expiry on the link path (as on the settlement path).
- **Compliance (the real one)** → central identity makes NordStern a data controller; consent +
  minimization + per-anchor operability contain it; flag for counsel (§5), do not resolve in code.

## 10. Current state vs. target (as of 2026-07-10)

- ✅ Email-first central identity, `ns_customer` session, DIDIT KYC, self-custodial SEP-10
  settlement, per-anchor transaction scoping — all already exist and are correct in shape.
- ❌ **P0 defect:** `POST /wallets` links an arbitrary address with **no ownership proof**, and
  history scoping trusts the linked-wallet set → a logged-in user who knows a victim's public
  Stellar address can link it and read that anchor's transaction history for it. Confidentiality
  breach. Fix before demo/deploy.
- ❌ Wallet uniqueness is per-customer, not global → same address claimable by multiple accounts.
- ❌ Cross-anchor KYC reuse is automatic, not consented.
- ❌ Authorization tiers are implicit, not named/enforced.

## 11. Roadmap

1. **Fix P0** — require proof of ownership before a wallet is attached; scope history to proven
   wallets; global unique wallet bond. Shape the proof record as the **first instance of the
   future proven-capability model** so it is not migrated twice.
2. **This ADR** — the stable design to build against.
3. **Identity + Credentials layer** — introduce `Customer → Identity → Credentials → Wallets`,
   with the authenticator/capability split. Ship the **per-anchor consent boundary in the same
   step** (they are one deliverable).
4. **Consented KYC sharing** — replace automatic reuse with grant/revoke.
5. **Passkey / embedded wallets** — added as **another signing capability** under the same
   identity, not a replacement for it. This is the Privy endgame with no data-model change: the
   customer identity treats "how you sign" as a swappable capability (self-custodial today,
   embedded/passkey tomorrow), so a customer can migrate keys without changing who they are.

## 12. Database implications (shape, not DDL)

- `customers` (person): `id`, `email` (unique), `full_name`. Identity truth.
- `credentials` (future): `id`, `customer_id`, `type` (email/passkey/phone/oauth/external_wallet/
  embedded_wallet), `kind` (`authenticator` | `signing_capability`), proof metadata, `proven_at`,
  `revoked_at`. The P0 wallet-proof record is the first row of this table's proven-capability form.
- `customer_wallets`: add `proven_at`, `proof_nonce`, `proof_signature`/`proof_tx`; **global
  unique on `address`**; unproven rows grant nothing (or don't exist).
- `customer_kyc`: one per person (DIDIT session, status, verified_at).
- `anchor_kyc_consents`: `(customer_id, anchor_id, granted_at, revoked_at)` — the containment
  boundary.
- Transaction visibility query joins only **proven** wallets.

## 13. API implications

- **New:** `POST /wallets/challenge` (nonce) + `POST /wallets/verify` (signature → proven bond).
  Deprecate unproven `POST /wallets`.
- **New:** consent grant/revoke; `centralKycApproved` consults consent.
- **Harden:** `GET /customer/transactions` scopes on proven wallets only.
- **Formalize:** the L1/L2/L3 authorization contract, enforced in both platform-api and the
  business server; the business server trusts session for reads and demands wallet signature for
  value independently.

## 14. Open decisions (flagged, not silently resolved)

- **D1 — Re-proof risk policy:** exact thresholds/signals that trigger L2 re-proof (amount,
  dormancy window, device/IP change). Start conservative; tune with data.
- **D2 — Consent granularity:** is a consent grant all-or-nothing per anchor, or scoped (KYC
  status only vs. full identity attributes)? Leaning scoped/minimal.
- **D3 — Data-controller posture:** central NordStern Identity is a regulated posture (VDA/data
  controller). Requires qualified Indian fintech/data counsel before real funds — do not resolve
  in code (§5).
- **D4 — Embedded-wallet custody:** passkey/embedded wallets as a signing capability must stay
  non-custodial (passkey = the key) to avoid the custody gate; confirm against
  `nordstern-passkey-smart-wallets` and counsel.
