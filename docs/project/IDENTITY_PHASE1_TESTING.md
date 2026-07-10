# Identity Phase 1 — Test Plan (Proven Wallet Linking / P0 fix)

Covers the fix that closes the wallet-linking confidentiality defect: a wallet is attached to a
customer only after **cryptographic proof of ownership** (a signed challenge), the bond is
**globally unique**, and transaction history is scoped to **proven wallets only**.

Design of record: `IDENTITY_ARCHITECTURE.md`. Code: `platform/api/src/lib/walletProof.ts`,
`platform/api/src/services/customer.service.ts`, `platform/api/src/api/v1/customer.routes.ts`,
`platform/api/src/api/v1/internal.routes.ts`; frontend `anchor-template/anchor-client/lib/link-wallet.ts`.

## Automated (already green)

```bash
cd platform/api && npm run test        # walletProof + customer.wallets service tests (20 cases)
cd platform/api && npm run typecheck
cd anchor-template/anchor-client && npx tsc --noEmit
```

- `src/lib/__tests__/walletProof.test.ts` — crypto: happy path, wrong signer, altered/other nonce,
  tampered tx, unsigned, wrong network, wrong source account, garbage input, missing manage_data op.
- `src/services/__tests__/customer.wallets.test.ts` — service branches: global-unique reject at
  issue and at write (TOCTOU), no-active-challenge, wrong-key, replay (consume=false), idempotent
  re-link of own wallet, malformed address.

## Prerequisites for manual testing

1. Apply the migration to the platform DB: `cd platform/api && npm run db:migrate` (adds
   `proof_*` columns, global-unique `customer_wallets_address_uq`, `customer_wallet_challenges`).
2. Run/redeploy platform-api with the new code.
3. Two Stellar wallets available in a browser wallet (e.g. Freighter): **W1** (yours) and **W2**
   (a second account you also control, to simulate "someone else's address").
4. Two customer accounts by email OTP: **Alice** and **Bob**.

---

## A. Wallet linking — happy path (L2 proof)

1. Sign in as Alice. Go to **Profile → Linked wallets → Connect & verify a wallet**.
2. Pick W1 in the wallet modal; approve the connection.
3. A **second** wallet prompt appears: "sign this verification request." Approve it.
4. **Expect:** W1 appears in the list with a green **Verified** badge. No address text box exists.
5. Reload — W1 persists.

DB check: `select address, proven_at, proof_type, proof_nonce from nordstern.customer_wallets;`
→ one row, `proven_at` set, `proof_type = signed_challenge`, `proof_nonce` populated.

## B. Ownership proof is required (cannot link a wallet you don't control)

Simulate an attacker who knows a victim's public address but can't sign for it.

1. As Alice, call the API directly (address you do NOT control, e.g. Bob's W2 public key):
   ```bash
   curl -s -X POST $API/api/v1/customer/wallets/challenge \
     -H 'content-type: application/json' -b alice.cookies \
     -d '{"address":"<W2_PUBLIC>","network":"testnet"}'
   ```
   → 200 with a `challengeXdr` (issuing a challenge is harmless).
2. Submit a bogus or self-signed-with-wrong-key XDR to verify:
   ```bash
   curl -s -X POST $API/api/v1/customer/wallets/verify \
     -H 'content-type: application/json' -b alice.cookies \
     -d '{"address":"<W2_PUBLIC>","signedXdr":"<garbage-or-wrong-signer>"}'
   ```
   → **400** `Could not verify wallet ownership`. No row inserted.
3. **Expect:** Alice can never attach W2 without W2's signature.

## C. The removed unproven endpoint is dead

```bash
curl -s -X POST $API/api/v1/customer/wallets \
  -H 'content-type: application/json' -b alice.cookies \
  -d '{"address":"<any-G-address>"}'
```
→ **400** `proof_required` ("Linking a wallet now requires ownership proof…"). Nothing is stored.

## D. Global uniqueness — one wallet, one identity

1. As Alice, link W1 (section A). Succeeds.
2. Sign in as **Bob**. Attempt to link the **same** W1:
   - Challenge step → **409** `That wallet is already linked to another account` (rejected before
     Bob even signs).
   - Even if a challenge had been issued, verify re-checks at write time → **409** (TOCTOU guard).
3. **Expect:** W1 belongs only to Alice. Bob cannot claim it — even though Bob could, in the old
   code, have read Alice's history through it.

## E. Replay protection (single-use, time-boxed challenge)

1. As Alice, run a full successful link of W1 and capture the `signedXdr` you submitted.
2. Re-POST the **same** `signedXdr` to `/wallets/verify` again.
   → **400** (`This verification was already used` / `No active verification`). The challenge row's
   `consumed_at` is set; it cannot be reused.
3. Issue a challenge, wait > 5 minutes, then submit → **400** (`No active verification`). Expired.

DB check: `select consumed_at, expires_at from nordstern.customer_wallet_challenges order by created_at desc;`

## F. Transaction visibility — proven wallets only (the actual leak)

1. As Alice with W1 proven, complete a Buy on this anchor with W1. Go to **Activity**.
   → the transaction appears (W1 is a proven wallet).
2. Directly probe the internal scoping endpoint:
   ```bash
   curl -s $API/api/v1/internal/customers/<ALICE_ID>/wallets -H "x-service-secret: $SVC"
   ```
   → `{ "addresses": ["<W1>"] }` — only proven addresses.
3. **Regression proof:** there is no code path that inserts an unproven `customer_wallets` row, so
   an address Alice merely *typed* can never widen `addresses` and never surface another party's
   transactions. (Old behaviour: typing a stranger's address exposed their history here.)

## G. Authorization boundaries (tiers)

- **L1 (session) suffices for reads:** `GET /wallets`, `GET /me`, `GET /kyc/status`, browsing
  Activity — all work with just the `ns_customer` cookie.
- **L2 (wallet proof) required for value/link:** linking a wallet requires a fresh signature
  (sections A/B). A stolen session cookie alone **cannot** link a wallet or move money — verify
  needs a signature the session can't produce.
- Unauthenticated calls to any `/wallets*` route → **401**.
- `/internal/*` without the correct `x-service-secret` → **401** (only trusted backends scope
  history).

## H. Buy/Sell auto-link is best-effort and proven

1. As a **new** Alice (no wallets), start a Buy with W1.
   → after connecting, you're prompted to **verify** W1 (one extra signature), then to authorize
   the payment. W1 becomes a proven linked wallet; the buy shows in Activity.
2. Repeat Buy with W1 → **no** extra verify prompt (already linked; `ensureWalletLinked` no-ops).
3. Decline the verify prompt during a Buy → the **buy still completes** (best-effort link skipped);
   W1 simply isn't linked centrally and that buy won't show in Activity until you link W1 in Profile.

---

## Follow-ups (out of scope for this patch)

- **Self-host parity:** `anchor-template/business-server/src/localAuth.ts` (the standalone identity
  plane, currently **unmounted**) still has the unproven-link path. It must adopt the same
  challenge/verify protocol before the self-host kit ships. Flagged in-file.
- Risk-triggered **re-proof** (L3 step-up) and **consented KYC** are later Identity phases (ADR §5–6).
