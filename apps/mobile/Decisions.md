# nordpay — Decisions log

Architectural / implementation decisions for the Stellar Anchor Wallet recreation
(design handoff → native Expo app). Newest at the bottom. Rationale is captured so
a future agent doesn't re-litigate a settled choice. Newest at the bottom.

---

## D-001 — Mirror the prototype's `DCLogic` 1:1 in a Zustand store

The handoff's `.dc.html` embeds a `DCLogic` React-class state machine (state +
actions + view-model getters). We recreate that *verbatim* in a single Zustand
store rather than inventing our own state shape. Field names, initial values,
timer durations (processing→converting @1200ms→completed @2600ms), and the KYC
divert/return logic all match the source. **Why:** the design is authoritative and
high-fidelity; matching the source removes guesswork and keeps copy/behaviour exact.

## D-002 — `lib/` is the swappable mock seam

Anchors, assets/prices, activity, and quote math live in pure `lib/*` modules with
typed exports (`ANCHORS`, `PRICES`, `depositQuote`, …). Data is verbatim from the
prototype. **Why:** matches NordStern's "everything external is a swappable adapter"
principle (AGENTS.md §6). A real SEP-1 anchor list / SEP-38 quote source can slot in
behind these signatures later without touching flow screens. This is a demo build —
no real network, no funds, no Freighter signing.

## D-003 — Routing: no explicit `<Stack.Screen>` children

`app/_layout.tsx` renders a childless `<Stack>` carrying `screenOptions`
(headerShown:false, slide-in, canvas bg). Every file route auto-registers and
inherits those options. **Why:** declaring `<Stack.Screen name="deposit" />` etc.
for route files that don't exist yet produced `No route named "…" exists in nested
children` warnings on every reload. Filesystem discovery + shared screenOptions
removes the warnings permanently and the per-route maintenance. Add an explicit
`<Stack.Screen>` back only if one route needs *different* options (e.g. modal
presentation).

## D-005 — Deposit bumps the balance by the quoted `getN`, not stale `assetAmt`

The prototype's `runTx` bumps a deposit by `parse(assetAmt)`. But in the deposit flow
`assetAmt` is never updated — the quick-amount chips set `fiat` only. So tapping
₹10,000 then confirming bumps +4,975 while the Review receipt says +9,950 INRC (a
latent bug, hidden only because the demo uses defaults where 5000 − 0.5% = 4975 =
the initial assetAmt). **Decision:** deposit bumps by `depositQuote(fiat, anchor,
asset).getN` — exactly the "you receive" figure the user just approved. Identical on
the default path; correct for any amount. `assetAmt` remains the *withdraw* input.
(Confirmed with advisor.)

## D-006 — KYC gate: never pre-advance the flow step when diverting

The identity gate exists **only** on the Amount→Review transition; Review→Pay→Confirm
is ungated. So `requestReview()` must NOT set `step=2` before KYC completes — if it
did, an unverified user who backs out of the KYC screen would land on a confirmable
Review and could deposit with no KYC. **Decision:** `requestReview()` leaves `step`
untouched when `needKyc()` (caller pushes `/kyc`); only `finishKyc()` sets
`step=kycReturn` (2) on success. Backing out returns to Amount and re-gates on the
next Review tap. The KYC screen pops via a one-shot `kycDone` flag (not "kycVerified
is truthy") so re-opening KYC when already verified doesn't instantly bounce.
(Advisor-flagged; would not have been caught by the happy-path verify.)

## D-004 — Fonts: Inter + JetBrains Mono via `@expo-google-fonts`

Design calls for General Sans (display) + JetBrains Mono (all figures). General Sans
isn't on Google Fonts; the handoff explicitly allows Inter 600 as the display
fallback. **Why:** `@expo-google-fonts/*` are SDK-pinned, offline, no asset plumbing.
Every number (balances, amounts, rates, addresses, timestamps) uses JetBrains Mono
per the spec.
