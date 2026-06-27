# Keel — Anchor Infrastructure Console
### Frontend PRD (Prototype) · v1.0

> **Working title:** *Keel* — the structural backbone that keeps a vessel stable and on course. Placeholder; swap freely (alternates: Ballast, Lodestar, Mooring, Bedrock).
> **Subject:** A B2B treasury & operations console for businesses that issue and operate a Stellar **anchor** (fiat ↔ token on/off-ramp) on Indian rails. The operator is a **financial institution** — a fintech, a payments company, an exchange desk. They log in to run the money, not to admire it.
> **The one job of this product:** Let an anchor operator *see the state of their money in real time and act on it* — what's coming in, what's going out, how much they've made, whether their reserves are healthy, and who is using them.

---

## 0. How to read this document (for the builder)

- **Scope:** This is a **frontend prototype** for demos and investor/partner reviews. No live backend. **All data is synthetic** (see §6) and **all actions are simulated** (see §7). The "Withdraw" button runs a believable flow and a success state — it moves no real money.
- **Fidelity bar:** Enterprise / institutional. The reference points are **Bloomberg Terminal** (density, real-time numerics), **Linear** (interaction polish, command palette, motion restraint), **Mercury / Modern Treasury / Stripe** (financial trust, clarity of money movement). It must not read as a CRUD admin panel or a template dashboard.
- **Non-negotiables:** (1) every number is monospaced and tabular-aligned; (2) money direction is always color-coded consistently (in = emerald, out = coral); (3) the product feels *alive* — values tick, the tape streams, arcs animate; (4) responsive to mobile, keyboard-focusable, reduced-motion respected.
- **Where to spend the polish:** §4.3 Treasury and §4.1 Overview are the **hero screens**. Build those to a mirror finish first (see §10).

---

## 1. Product framing & design thesis

**The Master Treasury model.** Keel runs an aggregator treasury: end-users pay INR, the platform mints tokens and holds the fiat, and the **anchor draws down its accumulated balance** when it wants its money. So the emotional core of the app is the moment the operator logs in and sees: *"This is how much I've made, and it's mine to withdraw."* The Treasury page is built around that moment.

**Design thesis — the console is an operations co-pilot, not a viewer.** Every lever the operator controls (spread, fees, liquidity, where idle capital sits) is shown with a **recommended value computed from live data, its reasoning, and a one-tap apply — always overridable.** The product makes the hard call and lets them veto it. This posture is what makes it feel like best-in-class infra rather than a set of charts.

**Four pillars the UI must make legible at a glance** (these map to the operator's day):
1. **Money in** — deposits / on-ramp / mint.
2. **Money out** — withdrawals / off-ramp / burn → payout.
3. **Trust & compliance** — who the users are, KYC, AML, reserves backing the tokens.
4. **The developer surface** — keys, config, webhooks, endpoint health.

---

## 2. Design language


### 2.1 Number, currency & data formatting

This is where a financial product earns or loses credibility. Specify and enforce:

- **Currency:** Indian Rupee, `₹` prefix, **Indian digit grouping** (lakh/crore): `₹54,200.00`, `₹12,45,300.00`. Provide a **compact toggle** in the top bar: `₹1.2L`, `₹3.4Cr`, `₹54.2K`. Default to full in tables, compact in KPI cards.
- **Token amounts:** mono, asset code suffix, sensible precision: `54,200.0000000 INRT` (Stellar = 7 decimals; show 2–4 in dense views, full on detail).
- **Stellar addresses:** truncate middle, copy-on-click: `GА3F…X9QZ` with a copy icon that flips to a check on click.
- **Tx hashes / IDs:** mono, truncated, copyable; full value in tooltip.
- **Timestamps:** relative for recency (`2m ago`, `1h ago`), absolute on hover (`27 Jun 2026, 14:32:08 IST`). Always IST.
- **Deltas:** `▲ +12.4%` in `--pos-500`, `▼ −3.1%` in `--neg-500`, neutral `–` in tertiary.
- **Status pills:** see §2.8.

### 2.2 Motion & micro-interactions

Motion exists to make money movement legible and the product feel live — never as decoration. Use **Framer Motion**, spring physics, subtle.

- **Live-value pulse:** when any streamed figure updates (balance, volume, a new tx row), it briefly flashes its semantic tint (pos/neg) and counts to the new value (200–400ms). This single behavior sells "real-time."
- **KPI count-up:** on mount, key numbers count from 0 → value (~600ms, ease-out). Once.
- **New transaction row:** slides in from top of the tape/table with a 250ms highlight, then settles.
- **Flow arcs:** on the globe and Sankey, animated dashes travel along the path in the direction of money movement (in = toward hub in emerald, out = away in coral).
- **Page transitions:** content fades/rises 8px over 200ms. Nav is instant.
- **Hover:** cards lift border to `--border-strong` + 1% surface lighten; buttons shift to their -400 shade; rows tint `--surface-2`.
- **Skeletons, never spinners:** every async surface shows shimmering skeleton placeholders matching final layout. (Even though data is synthetic, simulate a 300–700ms load on route enter to feel real.)
- **Reduced motion:** `prefers-reduced-motion` disables count-ups, arc travel, and pulses; values appear directly, arcs render static.

### 2.3 Component primitives

Build on **shadcn/ui** + Tailwind; restyle to the tokens above. Specify states (default/hover/active/focus/disabled/loading) for each.

- **Buttons:** *Primary* (aurum fill, `--bg-base` text — used for the few true actions like Withdraw); *Secondary* (surface-2 fill, border-default, text-primary); *Ghost* (transparent, text-secondary → primary on hover); *Destructive* (crit outline → crit fill on confirm). Loading = inline spinner + label swap ("Withdraw" → "Processing…"). Focus = 2px `--cool-500` ring offset 2px.
- **Cards/panels:** surface-1, border-subtle, 12px radius, 20–24px padding, optional mono eyebrow label top-left, optional action/menu top-right.
- **Stat / KPI card:** mono eyebrow label, Data-L value (count-up), delta line, optional sparkline (40px tall), optional tiny context ("vs. last 7d").
- **Data tables:** sunken header row with mono-caps column labels; 1px row dividers (border-subtle); zebra off (use hover tint); right-align all numeric columns; sticky header; column sort; row click → detail drawer; bulk-select checkboxes for ops. Virtual” long lists.
- **Status pills** (small, mono, tinted bg + solid dot): `Settled`/`Completed` (pos), `Pending`/`Processing` (warn), `Failed`/`Breach` (crit), `Awaiting KYC` (cool), `Minting`/`Burning` (aurum). Dot pulses softly while in a "processing" state.
- **Inputs/selects/toggles/sliders:** surface-2 fill, border-default, cool-500 focus ring. The **spread slider** (§4.4) is a custom dual-handle range with a live tooltip and zones.
- **Tabs / segmented control:** underline tabs for page sub-sections; segmented pill for time-range (24H / 7D / 30D / 90D / Custom) and direction filters (All / In / Out).
- **Drawer / sheet** (right side, 480–640px): the universal "detail" surface — transaction detail, user profile, KYC case. Slides in over a scrim.
- **Modal:** centered, surface-3, for confirmations (Withdraw confirm, key reveal).
- **Toasts:** bottom-right, surface-3, semantic left-border, auto-dismiss; action verbs match the trigger ("Withdrawal initiated").
- **Command palette (Cmd/Ctrl-K):** surface-3 modal, fuzzy search across pages, users, transactions, and actions ("Withdraw funds", "Toggle testnet", "Export this month"). This one component does enormous work for the "best-in-class" feeling — make it crisp.
- **Empty states:** an icon, one line of what this is, one line of what to do, and a primary action — never a blank box. Voice = the interface's (see §2.9).
- **Tooltips:** instant, surface-3, for truncated values, metric definitions ("Backing ratio = fiat+crypto reserves ÷ tokens issued"), and icon-only buttons.

### 2.3 States & copy doctrine

- **Loading = skeleton.** **Empty = invitation** ("No withdrawals yet. When users redeem INRT, payouts appear here."). **Error = direction**, in the interface's voice, never apologizing, always saying what happened and the next step ("Couldn't reach the payout service. Retry, or check Developer → Webhooks.").
- **Copy from the operator's side of the screen.** Name things by what they control: "Withdraw to bank," "Pricing," "Users," "Reserves" — not "Trigger payout API," "Mint endpoint," "treasury_balance_v2." Active voice, sentence case, consistent vocabulary end-to-end (the button that says "Withdraw to corporate account" produces a toast that says "Withdrawal initiated").

---

## 3. Information architecture & app shell

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TOPBAR                                                                     │
│ [Keel ◆]  Search / ⌘K …………………  [TESTNET ▾] [₹ Full/Compact] [◐ density] [🔔] [Acme Pay ▾] │
├────────────┬─────────────────────────────────────────────────────────────┤
│ SIDEBAR    │                                                              │
│ ◆ Overview │                       PAGE CONTENT                           │
│ ⇅ Transactions                                                            │
│ 🏛 Treasury │                                                              │
│ ◧ Pricing & Liquidity                                                      │
│ 👤 Users & KYC                                                             │
│ 🛡 Compliance                                                              │
│ 📊 Analytics                                                               │
│ ──────────                                                                 │
│ ⚙ Developer                                                                │
│ 👥 Settings & Team                                                         │
│            │                                                              │
│ [status ●]│                                                              │
└────────────┴─────────────────────────────────────────────────────────────┘
```

- **Sidebar:** icon + label, collapsible to icons-only (persisted). Active item: aurum-tint background, aurum left-border (3px), text-primary. Group divider before Developer/Settings (operational vs. configuration). A small **system-status dot** pinned at the bottom (green/amber/red → links to Developer → Status).
- **Top bar:**
  - **Brand mark** ◆ (a stylized keel/anchor or a four-point star — gold).
  - **Global search / ⌘K** — fuzzy, the spine of navigation.
  - **Environment switcher** — a prominent pill toggling **Testnet ⇄ Mainnet**. In Testnet, show a subtle 2px aurum-tint top hairline across the whole app and a "TESTNET" pill, so it's never ambiguous which environment is live. (Demo runs in Testnet.)
  - **₹ format toggle** (Full / Compact). **Density toggle.** **Notifications** bell (alerts feed: reserve warnings, large redemptions, failed payouts). **Account/org menu** (org name "Acme Pay", switch org, settings, sign out).
- **Responsive:** sidebar collapses to a bottom tab bar or hamburger on mobile; bento grids reflow to single column; tables become stacked cards with the key figures; the globe degrades to a flat flow list. Keep the Treasury hero and KPIs first on mobile.

---

## 4. Page specifications

### 4.1 Overview — *Mission Control*

**Purpose:** the 5-second answer to "is everything healthy and how are we doing today." The home screen and a hero showpiece.

**Layout (bento):**
```
┌───────────────────────────────────────────────┬─────────────────────────┐
│  TOTAL VOLUME (30D)        ▲ +18.2%            │   RESERVE HEALTH        │
│  ₹4.82 Cr                                       │   ◐ gauge  102.4%       │
│  ┌ sparkline ─────────────────────────────┐    │   backing ratio         │
│  └─────────────────────────────────────────┘    │   ● healthy             │
├──────────────┬──────────────┬──────────────┐   ├─────────────────────────┤
│ ACTIVE USERS │ NET FLOW 24H │ AVAILABLE BAL │   │  LIQUIDITY (two-sided)  │
│ 12,480 ▲4.1% │ +₹6.4L  in   │ ₹54.2L  →     │   │  Fiat  ████████░░  78%  │
│              │              │   Withdraw    │   │  USDC  ███░░░░░░░  31% ⚠ │
├──────────────┴──────────────┴──────────────┘   ├─────────────────────────┤
│  MONEY FLOW — live globe with arcs              │  LIVE TAPE              │
│  (in = emerald toward hub, out = coral away)    │  14:32 +₹2,000 mint ▲  │
│                                                  │  14:32 −₹500 payout ▼  │
│                                                  │  14:31 KYC pass …      │
└──────────────────────────────────────────────────┴─────────────────────────┘
```

**Components & content:**
- **Total Volume (30D)** — Data-L count-up, delta vs prior 30D, full-width sparkline (gold gradient fill). The marquee number.
- **Active Users** — count + delta; tiny "today" sub-figure.
- **Net flow (24H)** — signed, color-coded; expresses whether they're net-minting or net-redeeming today (a real operational signal). Show in/out split on hover.
- **Available balance** — mirrors Treasury; includes a small **Withdraw** shortcut (routes to Treasury confirm).
- **Reserve health gauge** — semicircular gauge of **backing ratio** (reserves ÷ issued tokens). Needle/arc colored: ≥100% pos, 95–100% warn, <95% crit, with a glowing arc near the floor. Center shows `102.4%` and a status word. (Definition in tooltip.)
- **Two-sided liquidity** — two horizontal meters: **Fiat liquidity** (for paying out off-ramps) and **USDC/crypto liquidity** (for minting on on-ramps), each with % of target and a warn icon when low ("≈2h of cover at current flow").
- **Money-flow globe (SIGNATURE)** — see §5.1. Animated arcs of recent deposits/withdrawals across India + cross-border, emerald in / coral out, gentle auto-rotate. The Twitter screenshot.
- **Live tape** — streaming feed of events (mint, burn→payout, KYC pass, withdrawal), newest on top, each row mono, signed, color-coded, with relative time and a click-through to detail.
- **Alerts strip (conditional):** if a reserve/liquidity threshold is crossed, a thin warn/crit banner appears above the grid with a one-tap action ("USDC liquidity low — top up or widen off-ramp spread").

**Interactions:** time-range segmented control (24H/7D/30D/90D) re-renders charts; clicking any KPI deep-links to the relevant page filtered to that metric; tape rows open the transaction drawer.

**Demo/wow:** globe arcs + live tape + count-ups firing on load; net-flow flipping sign as the scenario runs (§8).

---

### 4.2 Transactions — *Money In / Money Out*

**Purpose:** the real-time, authoritative ledger of every SEP-24 deposit and withdrawal. This is the operator's audit surface and the clearest expression of the two pillars "money in / money out."

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Transactions                                  [⤓ Export]  [⌘K filter]     │
│  ┌ IN ₹6.4L (142) ──┐  ┌ OUT ₹3.1L (87) ──┐  ┌ NET +₹3.3L ──┐ [24H ▾]     │
│  [All] [In] [Out] [Pending] [Failed]   Asset:[INRT▾]  Search user/hash…    │
├──────────────────────────────────────────────────────────────────────────┤
│ ⇣ TIME      DIR  TYPE     USER          AMOUNT      FEE     STATUS    HASH  │
│ 14:32:08   ▲ IN  Deposit  Priya S.      +₹2,000.00  ₹30     ● Settled  GА3…│
│ 14:31:55   ▼ OUT Withdraw Rahul M.      −₹500.00    ₹12     ◐ Payout…  GB7…│
│ 14:30:12   ▲ IN  Deposit  Aarav K.      +₹10,000.00 ₹150    ◐ Minting  G9F…│
│ 14:29:40   ▼ OUT Withdraw Neha T.       −₹1,250.00  ₹25     ✕ Failed   GC2…│
│ …                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Components & content:**
- **Direction summary bar:** three live counters — **In** (emerald, total + count), **Out** (coral), **Net** (signed) — over the selected range. These tick as new tx stream in.
- **Filters:** segmented direction (All / In / Out / Pending / Failed), asset selector, **search** by user, address, or hash; time range; saved-filter chips.
- **Table columns:** Time (relative, abs on hover) · **Direction** (colored ▲/▼ + word) · **Type** (Deposit/Withdraw, with the underlying step — Mint/Burn→Payout) · User (name + avatar, links to profile) · **Amount** (signed, mono, color-coded) · Fee (your take on this tx) · **Status** pill · Tx hash (copyable). Right-align numerics.
- **Status semantics:** a deposit moves `Payment received → Minting → Settled`; a withdrawal moves `Burn detected → Payout… → Settled` (or `Failed`). Processing pills pulse.
- **Row → Transaction drawer (right sheet):** the full lifecycle as a **vertical timeline** with timestamps and status at each hop:
  - **Deposit:** `SEP-10 auth → KYC verified → ₹ payment captured (Razorpay ref) → INRT minted (Stellar tx ↗ explorer link) → Credited to user wallet`.
  - **Withdrawal:** `INRT burn detected (Stellar tx ↗) → Payout queued → UPI transfer (UTR ●) → Settled to bank`.
  - Plus: user mini-card, asset & amounts, **fee breakdown** (spread component vs flat fee vs network fee — ties to Pricing), corridor, environment badge, raw JSON expander (for the developer audience), and copy-all.
- **Export:** CSV / PDF of the current filtered view (simulated download).

**Interactions:** live new-row insertion with highlight; click anywhere on a row opens the drawer; hovering a status pill shows the next expected step; failed rows offer a "View reason" → drawer with the error and a "Retry payout" (simulated).

**Demo/wow:** during scenario mode, deposits and withdrawals stream in with the pulse + slide-in; a withdrawal walks Burn → Payout → Settled in front of the viewer with the UTR appearing.

---

### 4.3 Treasury — *The Core* (HERO)

**Purpose:** the heart of the Master Treasury model and the product's emotional center. The operator sees **what they've made and withdraws it**, and understands the **reserves backing their tokens**. Build this screen to the highest finish.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Treasury                                                   TESTNET        │
│                                                                            │
│   AVAILABLE BALANCE                                                        │
│   ₹54,200.00                          ┌──────────────────────────────────┐ │
│   ● Ready to withdraw                 │  Withdraw to corporate account → │ │
│                                       └──────────────────────────────────┘ │
│   ┌ PENDING SETTLEMENTS ┐ ┌ LIFETIME VOLUME ┐ ┌ EARNED (30D) ┐            │
│   │ ₹8,450.00 · 12 txns │ │ ₹4.82 Cr        │ │ ₹1,24,300 ▲ │            │
│   └─────────────────────┘ └─────────────────┘ └──────────────┘            │
├───────────────────────────────────┬────────────────────────────────────────┤
│  RESERVE COMPOSITION (Sankey)      │  RESERVE TIERS & YIELD                 │
│  Fiat in ─┬─► Hot buffer  ₹—       │  Hot      ██░░░░  ₹X   0%   never used │
│           ├─► Warm (T-bills) ₹—    │  Warm     ████░░  ₹Y   6.8% T+1        │
│           └─► Deployable   ₹—►yield│  Deploy   █░░░░░  ₹Z   11.2% cross-chn │
│                                    │  [ Optimize allocation ▸ ]  (advisory) │
├───────────────────────────────────┴────────────────────────────────────────┤
│  BACKING & PROOF-OF-RESERVES                                               │
│  Tokens issued 1,02,40,000 INRT   Reserves ₹1,04,80,000   Ratio 102.4% ●   │
│  [ View attestation ]   last verified 14:00 IST                            │
├──────────────────────────────────────────────────────────────────────────┤
│  WITHDRAWAL HISTORY  (table: date · amount · to account · UTR · status)    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Components & content:**
- **Hero balance (SIGNATURE):** **Display-XL** mono `₹54,200.00`, with a faint radial aurum glow behind it and a subtle count-up on load. A `● Ready to withdraw` status line. This is the single most important element in the app — give it air, weight, and the gold treatment.
- **Primary CTA — "Withdraw to corporate account":** the one true Primary (aurum) button in the product, placed beside the balance. Opens the **Withdraw flow** (modal):
  1. **Amount** — default = full available; presets (25/50/100%); validation against balance.
  2. **Destination** — saved corporate bank account card (masked acct `••6642`, IFSC, bank logo); option to manage accounts.
  3. **Review** — amount, destination, expected arrival ("Instant via RazorpayX • UPI/IMPS"), any fee. Copy: "You're withdrawing ₹54,200.00 to Acme Pay ••6642."
  4. **Confirm** — button label "Withdraw now" → loading "Processing…" (simulate 1.5–2.5s) → **success state**: a generated **UTR**, timestamp, and "Withdrawal initiated" toast. Balance animates down to ₹0.00; a new row appears in Withdrawal History as `Processing` then flips to `Settled`.
- **Secondary metrics (cards):** **Pending settlements** (₹ + count of in-flight deposits not yet swept into available), **Lifetime volume**, **Earned (30D)** (your revenue: fees + spread + yield, with delta; links to Analytics revenue breakdown).
- **Reserve composition Sankey (SIGNATURE):** animated flow from `Fiat in → {Hot buffer, Warm (T-bills/liquid funds), Deployable}`, with the deployable strand flowing on to `Cross-chain yield`. Makes the treasury logic visible at a glance. Hover a strand for its amount and policy.
- **Reserve tiers & yield (the monetization/idle-capital module):** three bars with amounts and **current yield** — **Hot** (cash, 0%, "never touched"), **Warm** (T-bills/liquid, ~6–7%, ~T+1), **Deployable** (only profit/excess beyond 1:1, higher/cross-chain yield, with auto-unwind note). An **"Optimize allocation"** advisory panel computes how much is *safely deployable* from outstanding liabilities + redemption velocity, recommends a split, and (in the prototype) shows the projected incremental yield — **clearly advisory, the operator approves.** Copy must make the safety model obvious: *"Reserves backing redeemable tokens are protected. Only profit and excess can be deployed."*
- **Backing & Proof-of-Reserves:** tokens issued vs reserves vs **ratio** (with the gauge mirrored from Overview), a `View attestation` action (opens a clean attestation sheet — issuer, assets, ratio, timestamp, signature hash), and "last verified" time. A strong institutional trust signal.
- **Withdrawal history:** table — date · amount · destination acct · UTR (copyable) · status. Click → drawer with the payout timeline.

**Interactions:** the Withdraw flow is the showpiece interaction — make every step feel considered. Optimize-allocation opens a side panel with a before/after allocation diff and an "Apply (advisory)" that updates the Sankey/bars.

**Demo/wow:** logging in to a healthy gold balance; running the full Withdraw flow to a UTR and watching the balance + history update live.

---

### 4.4 Pricing & Liquidity — *the smart-spread engine*

**Purpose:** the operator sets what they charge on on-ramp/off-ramp; Keel **recommends the optimal spread from live conditions** and lets them override. This is the clearest demonstration of the "co-pilot" thesis.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Pricing & Liquidity                                                       │
│  ┌ ON-RAMP (INR → INRT) ───────────────┐ ┌ OFF-RAMP (INRT → INR) ───────┐ │
│  │ Recommended  0.90%   [ Conservative ││ │ Recommended  1.40%           │ │
│  │ Your spread  ●────────●  1.10%       ││ │ Your spread  ●──────●  1.50% │ │
│  │ [ Use recommended ]                  ││ │ [ Use recommended ]          │ │
│  │ Why: low UPI cost, calm volatility   ││ │ Why: USDC vol ↑, inventory   │ │
│  └──────────────────────────────────────┘ └──────────────────────────────┘ │
│  ┌ FEE STRUCTURE ─────────────┐ ┌ INVENTORY-AWARE PRICING ──────────────┐  │
│  │ Flat fee   ₹—  + % —        │ │ Book: long INR / short USDC           │  │
│  │ per corridor / per tier     │ │ → off-ramp cheaper, on-ramp dearer    │  │
│  └─────────────────────────────┘ └────────────────────────────────────────┘  │
│  ┌ BACKTEST ──────────────────────────────────────────────────────────────┐ │
│  │ At 1.10% over last 30D:  earned ₹1.21L  ·  est. volume tradeoff −6%      │ │
│  │ [slider re-runs backtest live]            ┌ curve: margin vs volume ┐   │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Components & content:**
- **On-ramp & off-ramp cards:** each shows a **Recommended %** (computed), the operator's current spread on a **custom dual-handle slider** with **zones** (green "competitive", amber "high", red "uncompetitive"), a live tooltip, **Conservative / Recommended / Aggressive** presets, a **"Use recommended"** one-tap apply, and a **"Why"** explanation line citing the drivers (UPI MDR ≈ 0 so on-ramp can be tight; USDC volatility ↑ / settlement latency / inventory skew widen off-ramp). A small **competitive benchmark** marker shows the market mid-rate.
- **Guardrails:** min/max clamps and a **volatility circuit-breaker** toggle ("auto-widen if 1h realized vol > X"). Show as a clearly-labeled safety control.
- **Inventory-aware directional pricing:** a panel that reads the book (long INR / short USDC) and recommends making the *rebalancing* direction cheaper — "let user flow rebalance your book," like a market maker. Visualize the book skew as a balance beam.
- **Fee structure:** flat + % fields, configurable **per corridor** and **per user tier**; instant-settlement premium tier toggle.
- **Backtest (SIGNATURE for "intelligent"):** as the operator drags the spread, re-run a backtest over the last 30D of synthetic flow and show **₹ earned vs estimated volume tradeoff**, plus a **margin-vs-volume curve** with the current point marked. Evidence, not guessing.

**Demo/wow:** drag the off-ramp slider and watch the backtest ₹ and the curve update live; hit "Use recommended" and see the slider animate to the suggested value with the "Why" updating.

---

### 4.5 Users & KYC — *who is using this anchor*

**Purpose:** the searchable registry of end-users who completed Hyperverge KYC through this anchor's domain, plus the KYC funnel. Pillar: trust & compliance.

**Layout:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Users & KYC                                                               │
│  ┌ KYC FUNNEL ─────────────────────────────────────────────────────────┐  │
│  │ Started 14,210 ─► Doc 12,980 ─► Face 12,440 ─► Verified 12,110 (85%) │  │
│  │ drop-offs highlighted ⚠ at Face match                                 │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  [All] [Verified] [Pending] [Rejected] [Flagged]   Tier:[▾]  Search…       │
│ ⇣ USER         TIER   STATUS      VOLUME(LT)  TXNS  LAST SEEN   RISK        │
│ Priya Sharma   T2     ● Verified  ₹2,40,300   142   2m ago      Low         │
│ Rahul Mehta    T1     ● Verified  ₹54,200      31   5m ago      Low         │
│ Anon (G9F…)    T0     ◐ Pending    —            0   12m ago     —           │
│ Vikram R.      T2     ⚑ Flagged   ₹8,90,000     67   1h ago     High ⚠      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Components & content:**
- **KYC funnel:** horizontal funnel `Started → Document → Face match → Verified` with conversion % and **drop-off highlighting** at the weakest step (actionable: "Face-match drop-off 4.5% above network median"). Pass-rate KPI + delta + benchmark vs platform median.
- **User table:** name + avatar · **KYC tier** (T0/T1/T2 — progressive KYC) · **status** pill (Verified / Pending / Rejected / Flagged) · lifetime volume · tx count · last seen · **risk** badge (Low/Med/High). Right-align numerics; search by name/address; filter by status/tier.
- **Row → User drawer:** profile (masked PII, appropriate for the operator role) — name, tier, joined, **KYC details** (document type, verification timestamp, Hyperverge match score as a confidence bar, liveness ✓), risk score with contributing factors, transaction history (mini-table), lifetime volume & fees generated, and compliance actions (escalate, add note, request re-KYC) — all **simulated**. A "View in Compliance" link for flagged users.
- **Progressive/tiered KYC note in UI:** show tier thresholds (T0 small limits/minimal friction → T2 full KYC/high limits) as an explainer, reflecting risk-based CDD.
- **Reusable-KYC indicator (platform network effect):** a subtle badge when a user is "Verified across N anchors on Keel" — verify once, transact anywhere (with consent). Mind privacy framing in copy.

**Demo/wow:** the funnel animating to its proportions on load; opening a flagged high-risk user and seeing the confidence bars + risk factors.

---

### 4.6 Compliance Center — *AML / sanctions / reporting*

**Purpose:** turnkey compliance for an FIU-regulated environment — a genuine wedge for institutional anchors. Pillar: trust & compliance.

**Layout & content:**
- **Header KPIs:** Open cases · Sanctions hits (24h) · STRs filed (MTD) · Travel-Rule coverage %.
- **Case queue (table → drawer):** flagged transactions/users with reason (large-value, velocity spike, structuring pattern, sanctions match), severity, assignee, status (Open / In review / Cleared / Reported). Drawer = case detail with the triggering activity, related transactions graph, decision buttons (Clear / Escalate / File STR), and a notes thread — all simulated.
- **Sanctions / watchlist screening:** a screening panel showing matches against lists with match confidence and a clear/confirm action.
- **STR workflow:** a guided "File Suspicious Transaction Report" form (pre-filled from the case), producing a submitted state and a reference. Simulated.
- **Travel Rule:** status of originator/beneficiary info coverage on transfers above threshold; per-transfer indicator.
- **Transaction monitoring rules:** a list of active rules (e.g., "Single deposit > ₹2,00,000", "≥5 deposits/hour from one user") with toggles and hit counts — read-mostly in the prototype.
- **Audit trail / Blackbox (SIGNATURE trust element):** a tamper-evident, append-only **activity log** of every fiat/crypto action and every operator action, each line stamped and hash-chained (show a `prev → hash` chain visual), with a **"Generate compliance report"** action that produces a clean, exportable summary (policy checks passed, period, ratios, case outcomes). Frame as "every payout is governed and provably logged."

**Demo/wow:** open a case, walk Clear/Escalate; the hash-chained audit log with a verify-integrity check that turns green.

---

### 4.7 Analytics & Intelligence — *demographics & forecasting*

**Purpose:** the operator's growth and risk lens — explicitly the **demographics** request, plus behavior, cohorts, corridors, and a predictive layer that makes it feel like intelligent infra.

**Layout (bento):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Analytics                                       [24H 7D 30D 90D] [⤓]     │
│  ┌ INDIA HEATMAP (choropleth) ───────────┐ ┌ AGE / TIER DISTRIBUTION ───┐ │
│  │   states shaded by tx density          │ │  18-24 ███   T0 ██         │ │
│  │   drill → state → city                 │ │  25-34 █████ T1 ████       │ │
│  │   ● hotspots pulse                      │ │  35-44 ███   T2 █████      │ │
│  └────────────────────────────────────────┘ └────────────────────────────┘ │
│  ┌ TIME-OF-DAY × DAY HEATMAP ┐ ┌ COHORT RETENTION ┐ ┌ SOURCE ATTRIBUTION ┐ │
│  │ when money moves           │ │ curves by signup  │ │ Lobstr 42% …       │ │
│  └────────────────────────────┘ └───────────────────┘ └────────────────────┘ │
│  ┌ CORRIDORS ────────────┐ ┌ CONCENTRATION ┐ ┌ FORECAST (24-48h) ────────┐ │
│  │ INR→INRT hot, growth   │ │ top 1% = 38%  │ │ volume + liquidity demand │ │
│  └────────────────────────┘ └───────────────┘ └────────────────────────────┘ │
│  ┌ REVENUE BY SOURCE ───────────────────────────────────────────────────┐  │
│  │ Fees ████  Spread ██████  Yield ███   (stacked area over time)        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Components & content:**
- **India demographic heatmap (SIGNATURE):** drillable choropleth (state → city) shaded by transaction density, hotspots pulsing. An instant "built for India" moment.
- **Demographics:** age bands, KYC-tier distribution, device/OS split, new-vs-returning, language preference — as clean bar/donut sets.
- **Behavioral:** deposit-vs-withdraw ratio by segment; **transaction-size histogram**; **time-of-day × day-of-week heatmap** ("when does money move").
- **Cohort & retention:** retention curves by signup cohort; time-to-second-transaction; LTV per cohort; dormancy flags.
- **Corridor analytics:** hot fiat→asset paths, volume & growth, latency per corridor.
- **Source attribution:** which wallet/app sent the user (Lobstr vs others), conversion by source.
- **Concentration / whales:** top users by volume; "% of volume in top 1%" risk signal.
- **Predictive layer (futuristic flex):** 24–48h **volume forecast** and **liquidity-demand forecast** (line + confidence band), churn-risk scoring. Even a simple model reads as intelligent.
- **Benchmarking:** this anchor vs anonymized platform median across key metrics.
- **Revenue by source:** stacked area of fees vs spread vs yield over time (ties Treasury earnings to their drivers).

**Demo/wow:** the heatmap drilling from India → Maharashtra → Mumbai; the forecast band extending past "now."

---

### 4.8 Developer Console — *keys, config, webhooks, endpoints*

**Purpose:** anchors are developers too; treat the dev surface as first-class (Stripe/Circle doctrine). Pillar: the developer surface. Explicitly includes API keys and `stellar.toml`.

**Layout & content (sub-tabs: API Keys · Configuration · Webhooks · SEP Endpoints · Logs):**
- **API Keys:** list of keys (name, masked value `sk_test_••••a4F2`, scopes, created, last used). **Create key** → modal that **reveals the secret once** with a copy button and a clear "you won't see this again" warning; **Roll** and **Revoke** with confirm. Test vs Live keys gated by the environment switcher.
- **Configuration / `stellar.toml` (SEP-1):** a syntax-highlighted, **copyable** TOML block showing the anchor's config (HOME_DOMAIN, SIGNING_KEY, asset block: code/issuer/status, SEP endpoints, org info). A "Copy" and "Download stellar.toml" action; an editable-looking view with validation status (✓ valid). This is a concrete, credible developer artifact — render it beautifully (mono, line numbers, copy-on-hover).
- **Webhooks:** endpoint URL field, subscribed events (payment.captured, mint.completed, burn.detected, payout.settled, kyc.updated), a **delivery log** table (event, status 2xx/4xx, timestamp, attempts) with a **"Replay"** action per delivery and a payload viewer (pretty-printed JSON). Webhook replay is a power-user feature that signals seriousness.
- **SEP endpoint health:** status lights for **SEP-1 / SEP-10 / SEP-24 / SEP-31 / SEP-38** (Up / Degraded / Down) with latency, plus Horizon/RPC health. Green/amber/red.
- **API usage:** requests/min chart, error rate, rate-limit headroom.
- **Logs:** a filterable request log (method, path, status, latency, key) → row opens request/response detail. Developer-grade, mono.

**Demo/wow:** revealing a key with the one-time copy; the `stellar.toml` copy interaction; replaying a webhook and watching a new 200 delivery appear.

---

### 4.9 Settings & Team

**Purpose:** org configuration, access control, branding. Supporting, but completes the "one-stop" feel.

- **Organization:** legal entity details, FIU registration field, support contact, home domain.
- **Team & RBAC:** invite members; roles **Admin / Finance / Compliance / Developer / Viewer** with a permissions matrix (who can withdraw, who can change pricing, who can resolve cases); an **activity log** of "who did what."
- **Bank accounts:** managed corporate accounts for withdrawals (the destinations used in §4.3).
- **Branding / white-label:** logo + accent upload that themes the end-user **SEP-24 webview**; a live **preview of the mobile webview** (deposit screen with KYC + payment) rendered in a phone frame — a nice tie to the B2C side and a demo bonus.
- **Notifications:** which alerts go where (email/Slack/in-app) — names by what they control ("Reserve alerts", "Large withdrawals", "Failed payouts").

---

## 5. Signature components (the "wow" layer)

> Spend boldness here; keep everything around them quiet.

- **§5.1 Live money-flow globe** — WebGL globe (`cobe` or `react-globe.gl`), India-centered, gentle auto-rotate. Animated arcs for recent transactions: **emerald arcs inbound** to the hub for deposits, **coral arcs outbound** for withdrawals; arc thickness ∝ amount. New events spawn arcs in real time (driven by the synthetic stream). Degrades to a flat animated flow list on mobile / reduced-motion.
- **§5.2 Reserve composition Sankey** — animated flow `Fiat → {Hot, Warm, Deployable} → Yield`, strand width ∝ amount, dashes travel along strands. Hover = amount + policy. (`d3-sankey` or `@nivo/sankey`.)
- **§5.3 Reserve-ratio gauge** — semicircular backing-ratio gauge with a glowing arc that intensifies near the floor; color thresholds (pos/warn/crit). Mirrored on Overview & Treasury.
- **§5.4 Live transaction tape** — streaming ticker (Overview + optional persistent strip), trading-terminal style, signed/color-coded mono rows, newest on top with slide-in.
- **§5.5 Liquidity depth chart** — two-sided depth/inventory visual for fiat and crypto liquidity (optional, Pricing page).

---

## 6. Synthetic data specification (critical — realism is the #1 quality lever)

> Bad fake data kills a demo; great fake data makes viewers think it's live. Generate carefully with **faker** + a deterministic **seed** so the demo is reproducible.

**Org:** "Acme Pay" (operator), asset **INRT** (issuer `GА3F…X9QZ`), home domain `acmepay.in`, environment Testnet.

**Users (~12,000, render a realistic page of ~50–500 with virtualized scroll):**
- Realistic **Indian names** (mix of regions/languages), avatars (initials in tinted circles).
- KYC tiers T0/T1/T2 distribution skewed to T1; statuses mostly Verified, some Pending, few Rejected, ~1–2% Flagged.
- City/state from a weighted list (Mumbai, Bengaluru, Delhi NCR, Hyderabad, Pune, Chennai, Ahmedabad, Kolkata… long tail) — drives the heatmap.
- Risk mostly Low, a few High with plausible reasons.
- Lifetime volume **log-normal** (most small, a few whales) so concentration analytics look real.

**Transactions (continuous stream + ~30–90 days history):**
- Believable ticket sizes: deposits clustering at ₹500 / ₹1,000 / ₹2,000 / ₹5,000 / ₹10,000 with a long tail; withdrawals similar.
- **Organic time-series:** daily seasonality (peaks ~late morning & evening IST), weekday > weekend, a gentle upward trend, occasional spikes. Net flow should sometimes be in, sometimes out.
- Each tx carries: id, direction, type, user, amount, fee (derived from current spread + flat fee), corridor, status with realistic timestamps per hop, Stellar tx hash, Razorpay ref / UTR where relevant, source app (Lobstr/others weighted).
- Failure rate ~1–2% with plausible reasons.

**Treasury:** available balance `₹54,200.00` (matches hero), pending settlements `₹8,450.00`, lifetime volume `₹4.82 Cr`, earned 30D `₹1,24,300`, tokens issued `1,02,40,000 INRT`, reserves `₹1,04,80,000` (ratio 102.4%), tier split (Hot/Warm/Deployable) consistent with the Sankey.

**Pricing:** on-ramp current 1.10% (rec 0.90%), off-ramp current 1.50% (rec 1.40%); 30D realized vol series to justify recommendations; backtest curve data.

**Compliance:** a handful of open cases with distinct triggers; a couple of sanctions "near-matches"; an STR or two filed; a hash-chained audit log with ~50 recent entries.

**Developer:** 2–3 API keys (test/live), a `stellar.toml` populated from the org, ~50 webhook deliveries (mostly 200, a few 4xx to enable Replay), SEP endpoints mostly Up with one Degraded for realism, usage/error series.

**Analytics:** demographic distributions, cohort retention matrices, corridor stats, source attribution, and forecast series with confidence bands — all internally consistent with the transaction history.

---

## 7. Faux real-time specification

- A central **mock event generator** emits a synthetic event every ~2–6s (weighted: deposits > withdrawals > KYC events > occasional alert), wired to: the **live tape**, **globe arcs**, **Transactions** table top-insert, **Overview counters** (Total Volume, Active Users, Net Flow tick), and **Treasury** pending/available where relevant.
- Each emission triggers the **pulse/slide-in** micro-interactions (§2.7). Pausing is implicit during the Withdraw flow.
- **Route-enter loading:** simulate 300–700ms skeletons on first visit to each page so it feels like real fetching.
- All **actions are simulated** with realistic latency + optimistic UI: Withdraw (1.5–2.5s → UTR + success), Use-recommended spread (instant apply + toast), Replay webhook (→ new 200 delivery), File STR (→ submitted ref), Roll/Revoke key (→ updated list). No network calls; no real money; no real keys.

---

## 8. Demo / scenario mode

A top-bar **"Run demo"** control plays a scripted ~60–90s sequence so a presenter never has to improvise:
1. Land on **Overview** — KPIs count up, globe begins flowing, tape streams.
2. A burst of **deposits** streams in; Total Volume and Active Users tick; net flow turns more positive; a couple of emerald arcs fire.
3. Jump to **Transactions** — show a deposit walk `Payment → Minting → Settled` in the drawer.
4. A **withdrawal** appears and walks `Burn → Payout → Settled` with a UTR.
5. Go to **Pricing** — drag the off-ramp slider, backtest ₹ updates live, hit **Use recommended**.
6. A **liquidity alert** fires (USDC low); the Overview alert strip appears.
7. Go to **Treasury** — run the full **Withdraw to corporate account** flow to a UTR; balance animates down; history updates.
8. End on **Compliance** — open a case, verify the audit-log integrity (turns green).

Controls: Play / Pause / Reset (re-seeds to the canonical state). Each step optionally shows a small caption so the screen self-narrates.

---

## 9. Build stack & libraries

- **Framework:** Next.js (App Router) + TypeScript + Tailwind.
- **Primitives:** shadcn/ui (restyled to tokens). **Tremor** for fintech dashboard charts (KPI cards, area/bar, sparklines). **Recharts** or **visx** where custom viz is needed. **d3-sankey / @nivo/sankey** for the reserve Sankey.
- **Motion:** Framer Motion (springs; respect reduced-motion).
- **Globe:** `cobe` (lightweight) or `react-globe.gl`.
- **Maps:** an India TopoJSON choropleth (react-simple-maps or visx-geo).
- **Numbers:** a count-up hook; an INR formatter with lakh/crore + compact mode; `tabular-nums` enforced globally on numeric classes.
- **Data:** `@faker-js/faker` with a fixed seed; a small in-memory store + the mock event generator (§7); a `mockApi` layer with simulated latency so swapping in a real backend later is trivial.
- **Icons/Fonts:** Lucide; Space Grotesk + Inter + JetBrains Mono via next/font.

**Engineering notes:** centralize tokens in CSS variables + a Tailwind theme; watch CSS specificity on section/element selectors (don't let paddings cancel); virtualize long tables; ship the quality floor (responsive, visible focus, reduced motion) without announcing it.

---

## 10. Build priority (phasing)

Polish the heroes to a mirror finish first; let the rest be lighter but consistent.

**Phase 1 — the hero trio (the demo stands on these):**
1. **App shell** — sidebar, top bar, env switcher, ⌘K, tokens, fonts, primitives, density toggle.
2. **Treasury (§4.3)** — hero balance + Withdraw flow + reserve Sankey + backing/PoR. *The emotional core.*
3. **Overview (§4.1)** — bento KPIs + reserve gauge + two-sided liquidity + **flow globe** + live tape, with the mock event generator + count-ups. *The "wow."*
4. **Pricing & Liquidity (§4.4)** — recommended spread + slider + "Why" + live backtest. *Proves "intelligent, not CRUD."*

**Phase 2 — the operational depth:**
5. **Transactions (§4.2)** with the lifecycle drawer.
6. **Users & KYC (§4.5)** with funnel + user drawer.
7. **Developer (§4.8)** — API keys, `stellar.toml`, webhooks + replay, SEP health.

**Phase 3 — the institutional/intelligence finish:**
8. **Compliance Center (§4.6)** + audit/Blackbox.
9. **Analytics (§4.7)** — India heatmap + cohorts + forecast.
10. **Settings & Team (§4.9)** + webview branding preview.
11. **Scenario mode (§8)** wired across pages.

---

### Appendix A — Microcopy reference (use verbatim where possible)
- Treasury hero status: `Ready to withdraw`
- Primary CTA: `Withdraw to corporate account` → review line `You're withdrawing ₹54,200.00 to Acme Pay ••6642` → confirm `Withdraw now` → toast `Withdrawal initiated`
- Reserve tooltip: `Backing ratio = (fiat + crypto reserves) ÷ tokens issued`
- Deployable-tier reassurance: `Reserves backing redeemable tokens are protected. Only profit and excess can be deployed.`
- Liquidity alert: `USDC liquidity covers ~2h at current flow. Top up, or widen the off-ramp spread.`
- Empty transactions: `No withdrawals yet. When users redeem INRT, payouts appear here.`
- Key reveal warning: `Copy this secret now — you won't be able to see it again.`
- Pricing "Why" (off-ramp): `USDC volatility is up and your book is short USDC — a wider spread protects margin.`

### Appendix B — Definition of done (per screen)
Tokens-driven (no hardcoded colors), responsive to 375px, keyboard-navigable with visible focus, reduced-motion honored, skeletons on load, synthetic data wired, empty/error/loading states present, numbers mono + tabular + correctly formatted (₹ lakh/crore), and at least one considered micro-interaction.
