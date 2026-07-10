# Development Log

> **Context:** A chronological engineering journal tracking meaningful development sessions, problems encountered, and how they were solved.

---

## [Current Session] - Anchor Template Solidification & Documentation Overhaul

### Objective
Solidify the `anchor-template` codebase by connecting the frontend client to live APIs, resolving critical testnet integration bugs, and establishing a comprehensive, single-source-of-truth knowledge base.

### Changes Made
- Connected the Next.js `client` to the `business-server` `/admin` endpoints.
- Fixed a critical payload mismatch where the backend sent ISO date strings but the frontend expected Unix epoch timestamps (`number`).
- Reconfigured the SEP-24 deposit flow to handle cases where the wallet (like the Stellar Demo Wallet) does not provide a requested `amount` upfront. Defaulted to `10.00` USDC for testing purposes.
- Rebuilt and verified the `business-server` Docker container.
- Ran a successful end-to-end deposit using the Stellar Demo Wallet.
- Consolidated disparate Markdown files (`decision-log.md`, `FLOW_ARCHITECTURE.md`, `TESTING_GUIDE.md`) into a rigorous `/docs` knowledge base.

### Problems Encountered & Solved
1. **Client Crash on User Page:** The Next.js UI crashed when rendering the users table.
   * *Solution:* Identified that `lastSeen` was being sent as a string. Patched `/admin/users` in `business-server/src/admin.ts` to output `Date.getTime()` instead.
2. **Demo Wallet Trustline Errors:** The SEP-24 deposit flow failed because the Demo Wallet generated a transaction but did not establish a Stellar trustline for USDC.
   * *Solution:* Guided the operator to manually execute the "Add trustline" action in the Demo Wallet before confirming the interactive UI.
3. **Double-Spend Guardrail Triggered:** The first deposit attempt failed due to the trustline issue, locking the transaction in an `error` state.
   * *Solution:* Educated the operator that this is an intentional safety feature. A completely new transaction had to be initiated to proceed.
4. **Stellar SDK Validation Error:** `amount argument must be of type String, represent a positive number and have at most 7 digits after the decimal`. This occurred because `tx.amount_expected?.amount` was resolving to `'0'`, which the SDK rejects.
   * *Original stopgap:* Intercepted `'0'`/missing amounts and injected a `'10.00'` placeholder so the flow wouldn't crash.
   * *Proper fix:* Replaced the placeholder with a real amount-entry step. When `amount_expected` is missing **or `'0'`**, `/interactive` renders an amount form; the value is persisted in `nordstern.interactive_amounts` (keyed by tx id) — the AP's PATCH `/transactions` endpoint only accepts `amountIn`/`amountOut`, not `amount_expected`, so it can't hold this for us — and re-read server-side on the money screen and at `complete`. Note the `'0'` case must use a positive-number check, not `??` (which only falls through on null and would loop the user back to the form forever).

### UI/UX pass (SEP-24 interactive webview)

- Rebuilt the end-user deposit/withdraw/KYC/success screens (`business-server/src/sep24.ts`) from the old light-theme plain HTML to a premium dark theme mirroring the operator console's design tokens (`client/app/globals.css`): base `#100f16`, brand `#ab9ff2`, emerald-in, north-star brand mark, gradient CTAs, quick-pick amount chips. Presentational only — KYC/amount/money control flow and the `postMessage` wallet-handoff contract are unchanged. Self-contained (inline CSS/SVG, system fonts) since these render inside third-party wallet webviews.

### Open Questions

- (Resolved) Dynamic amount collection now handled via the interactive `<form>` step above.
