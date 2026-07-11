# Handoff: Stellar Anchor Wallet — deposit / withdraw & anchor flows

## Overview
A mobile crypto wallet for the **Stellar** network whose defining feature is deep
**anchor** support — moving between on-chain assets and local fiat money. It covers the
full on-ramp (deposit), off-ramp (withdraw), cross-border payout, and identity-verification
(KYC) journeys, wrapped in a believable Phantom/Lobstr-class wallet (portfolio, asset
detail, send, receive, swap, activity, settings).

Target runtime: **Expo / React Native** (per the requester). The visual language is a
dark, premium wallet aesthetic (Phantom-inspired): near-black canvas, a single **Perano
purple** accent, and a monospace face used for every number.

## About the Design Files
The file in this bundle — `Stellar Anchor Wallet.dc.html` — is a **design reference
created in HTML**. It is an interactive prototype demonstrating the intended look,
layout, copy, and behavior. **It is not production code to copy directly.**

Your task is to **recreate these screens in Expo / React Native** using the project's
established patterns and libraries (e.g. `expo-router` for navigation, `react-native`
primitives or a component kit, `react-native-svg` for icons, a state store of your
choice). Where this project already has conventions, prefer them over anything implied by
the HTML. The HTML uses a web design-system bundle (the "Phantom Design System"); you do
**not** need that bundle — every token value you need is inlined in the **Design Tokens**
section below.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interactions are final. Recreate
the UI faithfully using React Native equivalents. Exact hex values, font roles, sizes, and
copy are documented below and are authoritative.

## Stellar / SEP protocol mapping (important context)
The flows are modeled on the real Stellar Ecosystem Proposals an anchor implements. Wire
the UI to these:

- **SEP-1** (`stellar.toml`) — anchor discovery / metadata. Powers the **Anchor directory**
  (name, assets, home domain, supported rails). Each anchor card = one anchor's TOML.
- **SEP-10** — Stellar Web Authentication. The wallet signs a challenge to get a JWT before
  any transfer call. Happens silently on "Connect anchor".
- **SEP-12** — KYC/customer registration. Backs the **KYC flow** (personal details, address,
  ID document, selfie). Fields are anchor-dictated; the four-step flow here is a typical set.
- **SEP-24** — *interactive* hosted deposit/withdraw. The **Deposit** and **Withdraw** flows.
  In production the anchor may return a hosted URL to open in a webview; this design shows a
  **native, fully-branded** version (amount, method, quote, status polling) which is the
  preferred UX when the anchor supports **SEP-6** (programmatic) or provides fields via API.
- **SEP-31** — cross-border, anchor-to-anchor payments. The **Send abroad** flow (sender's
  anchor → receiving anchor pays out locally).
- **SEP-38** — quotes (rate + fee for a given amount/pair). Every "You receive" figure and
  fee line should come from a SEP-38 quote, refreshed as the amount changes.

Transaction status values (`pending_user_transfer_start`, `pending_anchor`, `completed`,
etc.) map to the status timelines shown on the final step of each flow.

## Information architecture / navigation
Bottom tab bar with four tabs; flows are pushed as full-screen stacks over the tabs.

- **Wallet** (home) — balances + quick actions
- **Anchors** — directory + cross-border entry
- **Activity** — transaction history
- **Settings**

Pushed stacks (no tab bar): Asset detail, Deposit, Withdraw, Send abroad (cross-border),
KYC, Send, Receive, Swap.

**Navigation model:** a stack of screen keys with push/back. Tabs reset the stack. Flows
that require KYC check a `kycVerified` flag at the review step and, if false, divert into
the KYC flow, remembering where to return (`kycReturn = {screen, step}`); on success they
resume at that exact step.

---

## Screens / Views

### 1. Wallet / Home
- **Purpose:** at-a-glance net worth + entry to every money movement.
- **Layout:** vertical scroll. Top row: 38px circular account avatar (gradient) · center
  "Account 1 ▾" pill · 38px scan icon button. Centered total-balance block. A 5-up quick-action
  row. A featured gradient banner. A segmented control (Tokens / Activity). Then the list.
- **Components:**
  - **Total balance:** label "Total balance" (13px, secondary). Amount in **mono 42px / 600**,
    white, tracking −0.01em (e.g. `$2,845.20`). Below: a success **Badge** (`+$48.20 · +2.13%`).
  - **Quick actions (5):** Deposit, Withdraw, Send, Receive, Swap. Each = 50px circle
    (`--bg-surface-2`, 1px border, Perano-purple icon) above an 11.5px semibold label.
  - **Featured banner:** full-width, `--radius-lg` (24px), background linear-gradient 135°
    from `#AB9FF2` → `#3C315B`, white text, `--shadow-md`. Icon tile (42px, white @16%) +
    title "Add money instantly" + subtitle "UPI, Google Pay & bank via Meridian" + "→".
    Tapping opens Deposit pre-set to the Meridian anchor / INRC.
  - **Segmented control:** Tokens | Activity.
  - **Token row:** 42px colored circle with 2-letter symbol · name (display 15/600) over
    `4,208.55 XLM` (mono 12.5, secondary) · right: USD value (mono 15) over % change
    (mono 12.5; green `--success` up, red `--error` down). Tapping opens Asset detail.
  - **Activity preview:** first 4 activity rows (see Activity screen).

### 2. Anchors (directory)
- **Purpose:** browse anchors, connect them, and enter cross-border send.
- **Layout:** H1 "Anchors" + one-line description. A gradient **"Send money abroad"** banner
  (same treatment as home banner; globe icon; opens cross-border). Then two labeled groups:
  **Connected** and **Available**.
- **Anchor card:** 44px colored circle w/ initials · name (display 15.5/600) — the user's own
  anchor gets a small "Your anchor" pill (10px, Perano text on `--brand-100`, `nowrap`) ·
  rails line (12px secondary, e.g. "UPI · GPay · Bank · Card") · `region · fee X%` (mono 11,
  tertiary) · chevron. Connected cards carry `--shadow-sm`. Tapping opens Anchor detail.

### 3. Anchor detail
- **Purpose:** understand an anchor and connect / deposit / withdraw.
- **Layout:** back header. Centered 66px avatar, name (h3 22/600), `tagline · region`, and a
  connect toggle pill. A centered blurb. Cards for **Supported assets** (mono chips),
  **Funding methods** (icon + label + desc rows), and a **fee / settlement / identity**
  detail card. Sticky footer: **Deposit** (primary) + **Withdraw** (secondary), 50/50.
- **Connect pill states:** not connected → "Connect anchor", Perano text on `--brand-100`.
  Connected → " Connected · tap to remove", `--success` text on `--success-fill`.

### 4. Deposit (on-ramp) — 5 steps core flow
Sticky footer button per step; progress = 4 bars + a mono caption. Back arrow in header
(hidden on the final status step).

- **Step 0 · Method:** an "Adding {ASSET} via {ANCHOR}" summary row, then a list of method
  cards for the anchor's rails. Each card: 40px rounded icon tile · label + description ·
  a green speed **badge** (e.g. "Instant", "~5 min", "1–2 days"). Selected card gets a 1.5px
  Perano border. Footer disabled ("Choose a method") until one is picked, then "Continue".
  Methods by anchor rail id:
    - `upi` — "UPI" / "Pay from any UPI app" / Instant
    - `gpay` — "Google Pay" / "One-tap with GPay" / Instant
    - `imps` — "Bank transfer" / "IMPS / NEFT" / ~5 min
    - `card` — "Debit / credit card" / "Visa · Mastercard · RuPay" / Instant
    - `ach` — "Bank transfer" / "ACH" / 1–2 days
    - `sepa` — "Bank transfer" / "SEPA" / 1 day
    - `wire` — "Wire" / "Same-day domestic wire" / Same day
    - `cashin` — "Cash deposit" / "At any MoneyGram location" / Minutes
- **Step 1 · Amount + quote:** big centered mono input prefixed with the fiat symbol; three
  quick-amount chips (`₹1,000` etc.). A quote card: You pay / Anchor fee · X% / Rate /
  **You receive** (Perano, mono 16/600). "Arrives {settlement}" clock line. (Quote = SEP-38.)
- **Step 2 · Review:** big "you'll receive" figure; summary card (Pay with / Anchor / You pay
  / Anchor fee / Arrives); a green "Identity verified" reassurance strip. **Gated:** reaching
  this step when `kycVerified` is false diverts to KYC first, returning here on success.
- **Step 3 · Pay (method-specific):**
    - UPI / GPay → "Paying to Meridian · meridian@stellar", amount, and a 4-app picker
      (Google Pay, PhonePe, Paytm, BHIM).
    - Card → card number / expiry / CVC / name inputs.
    - Bank (imps/ach/sepa/wire) → beneficiary account / IFSC / name / amount + an info alert.
    - Cash (cashin) → a mono reference code (e.g. `MG-4821-9930`) to show at a location.
    Footer: "Pay {amount}".
- **Step 4 · Status:** spinner → success check (pop-in). A 3-row timeline: Payment received →
  Converting to {ASSET} → Delivered to your wallet, advancing on a timer. On completion the
  asset balance increases. Footer "Done" returns home.

### 5. Withdraw (off-ramp) — 4 steps core flow
Same chrome (3 progress bars).
- **Step 0 · Amount:** mono input with asset suffix; "Available {balance}" + **MAX** chip;
  quote card (You send / fee / rate / **You receive** in fiat).
- **Step 1 · Destination:** 3-way segmented (UPI ID / Bank account / Cash pickup) driving a
  labeled input; an "Cashing out via {anchor}" row.
- **Step 2 · Review:** fiat payout figure; summary (You send / fee / Sent to / Arrives) +
  identity strip. **KYC-gated** like deposit.
- **Step 3 · Status:** spinner → success; timeline Sent to {anchor} → Converting to {fiat} →
  Paid out to you. Balance decreases on completion.

### 6. Send abroad (cross-border, SEP-31) — 4 steps
- **Step 0 · Recipient:** country chips (Nigeria/Kenya/Philippines/Mexico/Brazil) · delivery
  method cards (Bank deposit / Mobile money / Cash pickup) · recipient name + account inputs.
- **Step 1 · Amount:** "You send" USDC mono input; a down-arrow divider; "They receive" in
  local currency (Perano). Rate + fee card.
- **Step 2 · Review:** recipient / destination / you send / fee, plus a SEP-31 info alert.
- **Step 3 · Status:** spinner → success; timeline Submitted to anchor → Converting USDC → NGN
  → Delivered to {recipient}. USDC balance decreases.

### 7. KYC / Identity verification — 4 steps + verifying
Entered from a gated flow (returns to it) or from Settings (returns to Settings).
- **Step 0 · Personal:** a purple reassurance strip, then Legal name / Date of birth /
  Country inputs.
- **Step 1 · Address:** address / city / PIN inputs.
- **Step 2 · ID document:** document-type chips (Aadhaar / PAN card / Passport / Driver's
  licence) · document number · a dashed "Photograph your document" drop zone.
- **Step 3 · Selfie:** 160px dashed circle; "Capture selfie" (secondary) fills it with a green
  check; submit is disabled until captured.
- **Verifying:** full-screen spinner (~1.8s) → sets `kycVerified = true`, shows a success
  toast, and returns to the remembered screen/step.

### 8. Asset detail
Back header w/ asset name. Centered 60px avatar, mono balance, `USD · %change`. A sparkline
(area + line, Perano). Deposit / Withdraw / Swap (small buttons). Issuer / asset detail card.
"Recent" list filtered to this asset. Deposit/Withdraw route to the asset's issuing anchor.

### 9. Send / 10. Receive / 11. Swap (supporting)
- **Send:** mono amount, recipient + memo inputs, "Review send" → success toast home.
- **Receive:** QR (rendered), address chip w/ copy, "share to receive" copy.
- **Swap:** pay card (amount + token pill) · circular swap toggle · receive card · rate row ·
  "Review swap" → success toast home.

### 12. Settings
Account card (avatar / name / mono address / copy). "Identity verification" row showing
Verified/Not-verified status (opens KYC). **Preferences** group of switches: Hide balances,
Face ID, Notifications, Light theme (toggles `data-theme`; RN: your theme context).
**Security** group: Recovery phrase, Help & support.

---

## Interactions & Behavior
- **Navigation:** push/back stack over reset-on-tab bottom tabs. Flows are pushed screens.
- **Multi-step flows:** a `step` index per flow; footer button advances; back arrow decrements
  step then pops the screen.
- **KYC gating:** at each flow's review step, if `!kycVerified` → push KYC with
  `kycReturn = {screen, step}`; on verify, restore.
- **Simulated settlement:** on pay/confirm, status starts `processing`, → `converting`
  (~1.2s), → `completed` (~2.6s); on completion the relevant balance is mutated. Replace with
  real SEP-24/31 status polling.
- **Toasts:** transient alert pinned above the tab bar, auto-dismiss ~3.2s (connect anchor,
  copy address, verify success, send/swap submitted, scan tapped).
- **Animations:** sheet-up on toast (320ms bounce), pop-in on success check (400ms bounce),
  continuous spin on loaders, subtle float available. Respect `prefers-reduced-motion` /
  RN reduce-motion.
- **Selection states:** method/segment/chip selection → 1.5px Perano border + Perano text.
- **Empty/disabled:** primary button renders disabled until its step's requirement is met.

## State Management
Single screen-level store is sufficient. Key state:
- `screen`, `stack[]` — navigation.
- `homeTab` — 'tokens' | 'activity'.
- `flow` ('deposit'|'withdraw'|'crossborder'), `step` — active flow position.
- `anchorId`, `asset`, `method` — deposit/withdraw selection.
- `fiat`, `assetAmt` — amounts (strings, comma-formatted; parse before math).
- `destType`, `dest` — withdraw destination.
- `cbCountry`, `cbMethod`, `cbName`, `cbAccount`, `cbAmt` — cross-border.
- `kycVerified`, `kycStep`, `kycReturn`, and the `k*` field values.
- `balances` — `{XLM, USDC, EURC, INRC}` numeric; `total()` = Σ balance×price.
- `conn` — per-anchor connected overrides; `txStatus`.
- Prefs: `balancesHidden`, `faceId`, `notif`, `uiTheme`.
- `toast`.
**Data fetching (production):** anchor list from SEP-1; quotes from SEP-38 (refresh on amount
change); KYC fields + status from SEP-12; transfer init + status polling from SEP-24/31;
auth via SEP-10. Prices from your price feed.

## Design Tokens

**Brand (Perano purple)**
- `brand-50 #F5F2FF` · `brand-100 #E2DFFE` · `brand-300 #C7BEF7` · **`brand-500 #AB9FF2` (primary)** · `brand-700 #8B7EE0` (hover/press) · `brand-900 #3C315B` (deep fills / gradient end)

**Dark theme (default)**
- canvas `#1A1A1A` · surface `#211F29` · surface-2 `#2A2733`
- border `rgba(152,151,156,0.24)`
- text primary `#FFFFFF` · secondary `#98979C` · tertiary `rgba(152,151,156,0.6)`

**Light theme** (`data-theme="light"` / RN theme):
- canvas `#FFFFFF` · surface `#F5F2FF` · surface-2 `#E2DFFE` · border `rgba(60,49,91,0.12)`
- text primary `#1A1A1A` · secondary `#6B6770` · tertiary `rgba(60,49,91,0.5)`
- brand text uses `#8B7EE0` for AA contrast on light.

**Semantic**
- success `#2EC08B` / fill `rgba(46,192,139,0.16)` (light `#1F9D74`)
- warning `#F2B84B` / fill `rgba(242,184,75,0.16)` (light `#B97A1B`)
- error `#FF4444` / fill `rgba(255,68,68,0.16)` (light `#D92D2D`)
- info `#7DB8F2` / fill `rgba(125,184,242,0.16)` (light `#3B6FD1`)
- overlay `rgba(0,0,0,0.8)`

**Typography**
- Display / headings: **General Sans** (fallback Inter). Weights 500/600.
- Body / UI: **Inter**.
- Numeric (balances, amounts, addresses, %, rates, timestamps, codes): **JetBrains Mono** —
  used everywhere a figure must read as exact.
- Scale used here: total balance mono 42/600; h1 26/600 tracking −0.02em; section titles
  15–16/600; body 13.5–14.5; labels/captions 11–13; mono figures 11–16.

**Radius:** sm 8 (chips) · md 16 (inputs, method cards, secondary buttons) · lg 24 (cards) ·
xl 32 (hero panels) · full 999 (primary buttons, badges, avatars, pills).

**Shadows (purple-tinted, Martinique):**
- sm `0 1px 2px rgba(60,49,91,0.08)`
- md `0 8px 24px rgba(60,49,91,0.16)`
- lg `0 16px 48px rgba(60,49,91,0.24)`
- glow/focus `0 0 0 4px rgba(171,159,242,0.24)`

**Motion:** fast 120ms · base 200ms · slow 320ms · standard `cubic-bezier(0.4,0,0.2,1)` ·
bounce `cubic-bezier(0.34,1.56,0.64,1)`.

**Spacing:** 4px base scale (4/8/12/16/20/24…). Screen gutters 16–18px; card padding 14–16px.

## Sample data used (for parity while stubbing)
- **Assets / prices:** XLM `$0.1218`, USDC `$1.00`, EURC `€1.09`, INRC `₹` peg (`$0.012`),
  NGNC (`$0.00065`). Home balances: 4,208.55 XLM · 1,250 USDC · 300 EURC · 18,400 INRC.
- **Anchors:** Meridian (India, "Your anchor", INRC, UPI·GPay·Bank·Card, 0.5%, Instant,
  connected) · Circle (US/EU, USDC·EURC, ACH·SEPA·Wire·Card, 1.0%, connected) · MoneyGram
  Access (Global, USDC, cash, 1.5%) · Vibrant (LatAm, USDC, 0.9%) · Cowrie (Nigeria, NGNC,
  1.2%) · Settle Network (AR/BR, 1.1%). *Meridian is a placeholder for the requester's own
  custom anchor — swap in the real `stellar.toml`.*
- Cross-border sample rate: 1 USDC = ₦1,650, 1% fee.
- Account address shown: `GBQK…7X4F9A2B`.

## Assets
- **Icons:** all inline SVG (stroke-based, 1.75–2px). Reproduce with `react-native-svg` or an
  icon set — no raster icon assets.
- **Fonts:** General Sans, Inter, JetBrains Mono — add via `expo-font` (Inter & JetBrains Mono
  are on Google Fonts; General Sans from Fontshare). If General Sans is unavailable, Inter
  600 is an acceptable display fallback.
- **Illustrations:** none. QR and sparkline are inline SVG placeholders — generate a real QR
  (recipient address) and a real price sparkline in production.
- No third-party brand logos are shipped; anchor marks are initialed color circles.

## Files
- `Stellar Anchor Wallet.dc.html` — the interactive design reference (all screens & flows).
  Open in a browser to click through. Built against a web design-system bundle that is **not**
  required for the RN build; all needed values are inlined above.
