# Phantom-Inspired Design System

A reusable visual language modeled on Phantom's brand identity — **friendly, rounded, confident, purple**. Built to drop into a React + CSS-variables project or to be used as a styling reference for generating on-brand interfaces, slides, and mocks.

> **Provenance & sources.** This system was constructed from a written brand spec, not a live codebase or Figma file. Core brand colors (`#AB9FF2`, `#3C315B`, `#E2DFFE`, `#F5F2FF`, `#2EC08B`) and the dark-theme UI tokens (`background`, `text`, `secondary`, `brand`, `error`, `radius 16px`, `overlay`) are pulled from Phantom's published brand assets and their official React SDK theming docs — treat those as ground truth. The extended scale, type system, spacing, motion, and component specs are a well-fitted extension in that spirit (Phantom does not publish a full public design system).
>
> Cited references in the source brief: Phantom brand colors/names (Brandfetch, `phantom.com`); dark-theme UI tokens + `ConnectBox` width (`docs.phantom.com/sdks/react-sdk`); rebrand narrative (Bakken & Baeck, F37 Foundry custom typeface, ghost mascot).

---

## Brand essence

Phantom's whole point is making crypto feel **approachable instead of intimidating**. Three principles drive every decision:

- **Friendly over flashy.** Soft rounding, warm purple, a quiet mascot instead of cold iconography. Nothing should look like a terminal.
- **Confident clarity.** Big legible type, generous spacing, one accent color doing all the work — not five competing gradients.
- **Quietly premium.** Restraint reads as trust. Motion and color are used deliberately, not constantly.

If a component doesn't fit *friendly, clear, premium*, it's probably off-brand.

---

## CONTENT FUNDAMENTALS

How copy is written across the system.

- **Voice: plain and warm, never jargon-y.** Say "Send money," not "Initiate transfer." Crypto terms are unavoidable (tokens, swap, address) but everything around them is everyday language.
- **Person: second person ("you/your").** Marketing speaks *to* the reader — "A crypto wallet that feels like it's on your side." Product UI is mostly label-driven ("Total balance", "Send SOL").
- **Casing: Sentence case everywhere** — headings, buttons, labels. No Title Case, no ALL CAPS except tiny mono affordances like `MAX`.
- **Consistent verbs.** A button that says "Download Phantom" leads to a screen that confirms "Downloaded," not "Success." "Send" stays "Send" throughout a flow.
- **Errors explain, they don't apologize.** State what happened and what to do next: *"Insufficient balance — add funds and retry."* No "Oops!", no "Sorry."
- **Two registers:**
  - *Marketing* — light personality, the occasional emoji (), playful but short phrasing ("Ready when you are").
  - *Product* — straightforward and precise. Anything touching money, security, or fees gets **zero cuteness**: exact numbers, mono type, clear consequences.
- **Numbers are exact and monospaced.** Balances, addresses, percentages, fees, timestamps render in JetBrains Mono so they read as trustworthy and unambiguous (`$12,480.22`, `7xKXtg2…aB91f3`, `+2.41%`).
- **Brevity.** Headlines are one idea. Helper text is one line. Buttons are 1–2 words.

**Examples**
- Hero: *"A crypto wallet that feels like it's on your side."*
- Feature: *"Send money, simply — transfer to any wallet or .sol name in seconds."*
- Empty/confirm toast: *"Sent — your transfer is on its way."*
- Error: *"Invalid address."* / *"Insufficient balance — add funds and retry."*

---

## VISUAL FOUNDATIONS

**Color vibe.** One warm purple (Perano `#AB9FF2`) does nearly all the accent work, over near-black canvas (`#1A1A1A`) in the default dark theme. Surfaces step up in subtle violet-tinted greys (`#211F29`, `#2A2733`). A light theme (`[data-theme="light"]`) swaps to white canvas with Magnolia/Fog purple tints. Semantic colors (success green `#2EC08B`, warning amber, error red, info blue) appear sparingly and almost always as a **16%-opacity fill + solid text/icon** pair, never as loud blocks. On light backgrounds, purple *text* steps to `#8B7EE0` for AA contrast — the `--brand` alias handles this automatically per theme.

**Type.** General Sans (display/headings, weight 600, tracking tightened to `-0.02em` at large sizes), Inter (body/UI, 400–600), JetBrains Mono (anything numeric). The mono face on numbers is a signature move — it reads "trustworthy fintech," not "marketing site." Big, legible, confident scale: hero up to 64px.

**Spacing & layout.** 4px base unit; everything snaps to it. 1200px max container, 24px desktop / 16px mobile gutters. Generous whitespace — clarity over density.

**Corner radii — large and friendly.** 16px is Phantom's confirmed default (buttons, inputs, modals). Cards round to 24px, hero panels to 32px, and primary buttons / badges / avatars / pill nav go fully round (999px). Sharp corners are essentially absent.

**Cards.** Surface fill (`#211F29`), 1px hairline border (`secondary @ 24%`), 24px radius, purple-tinted `shadow-md`. Interactive cards lift `translateY(-2px)` into `shadow-lg` over 200ms. No colored-left-border cards.

**Shadows — purple, not black.** All elevation uses Martinique-tinted shadow (`rgba(60,49,91, …)`), which is a big part of why the UI feels warm rather than generic. Focus/hover halo is a 4px brand-purple glow ring (`shadow-glow`).

**Backgrounds.** Mostly flat canvas. The one recurring flourish is a **soft purple radial-gradient glow** behind hero content / lock screen (`radial-gradient(... rgba(171,159,242,0.28) ...)`) — atmosphere, not a busy pattern. A `brand-500 → brand-900` linear gradient is reserved for big CTA panels and NFT thumbnails. No textures, no repeating patterns, no grain.

**Animation.** Deliberate and friendly. Tokens: 120 / 200 / 320ms; `ease-standard` `cubic-bezier(0.4,0,0.2,1)` for crisp interactions, `ease-bounce` `cubic-bezier(0.34,1.56,0.64,1)` for personality. Buttons/cards scale to 1.02 on hover, 0.97 on press. Modals/sheets enter scale `0.96→1` + fade with the bounce. Ambient float loops (mascot, marks) are slow (4–6s), ≤8px travel. Everything respects `prefers-reduced-motion` by dropping transform/scale and keeping opacity only.

**Hover / press states.** Hover = slight scale-up (1.02–1.08) + brand glow on brand elements; list rows get a surface-fill background. Press = scale-down (0.92–0.97). Links/ghost shift to brand purple. No opacity-dimming as the primary hover signal except for disabled (40% opacity, no pointer events).

**Borders.** Hairline, low-contrast: `secondary @ 24%` on dark, `violet @ 12%` on light. Used for card edges, dividers, input rest state, avatar rings. Inputs promote their border to brand-purple + glow on focus.

**Transparency & blur.** Sticky nav uses `backdrop-filter: blur(16px)` over canvas at ~78–80% opacity. Modal backdrop is `rgba(0,0,0,0.8)` (dark) / `rgba(20,17,28,0.5)` (light). Tint fills (16% opacity) carry semantic meaning everywhere.

**Imagery.** Cool-toned, purple-forward. Gradient-mesh blobs blending `brand-500 → violet-900 → brand-100` sit behind hero/empty states. The mascot is one quiet friendly presence per screen — a moment of warmth, never a UI element.

---

## ICONOGRAPHY

- **Style:** rounded-stroke line icons — 1.5–2px stroke, 24px grid, **round joins and caps**, no sharp right angles where avoidable. This matches the friendly, rounded brand geometry.
- **Source:** the system uses inline SVG line icons drawn to that spec (see the action icons in the wallet kit and feature icons in the site kit). For production, the recommended open sets are **[Phosphor Icons](https://phosphoricons.com)** (regular weight) or **[Lucide](https://lucide.dev)** — both already lean rounded-stroke and can be linked from CDN. Substitute either freely; keep stroke width 1.5–2px and joins/caps round.
- **No icon font or proprietary sprite** ships here (none was provided). If you import a real Phantom codebase, copy its icon assets into `assets/` and prefer those.
- **Emoji:** used *only* in marketing copy as an occasional accent (). Never in product UI.
- **Unicode glyphs** (`▾`, `×`, `▮`) are used sparingly for tiny affordances (chevrons, dismiss, signal bars) — fine at small sizes, but prefer an SVG for anything prominent.
- **Token/coin icons** are circular initials chips on a brand color in the kits — placeholders for real token logos.

---

## INDEX — what's in this folder

**Foundations**
- `styles.css` — the single entry point consumers link. `@import`s everything below.
- `tokens/colors.css` · `typography.css` · `spacing.css` · `radius.css` · `motion.css` · `fonts.css`
- `guidelines/*.card.html` — foundation specimen cards (Colors, Type, Spacing, Brand) shown in the Design System tab.
- `assets/` — `logo-mark.svg`, `wordmark.svg` ( placeholders — see Caveats).

**Components** (`window.PhantomDesignSystem_a666e0.*`)
- `components/buttons/` — `Button`, `IconButton`
- `components/forms/` — `Input`, `Switch`
- `components/data-display/` — `Card`, `Badge`, `Avatar`
- `components/feedback/` — `Alert`, `Dialog`
- `components/navigation/` — `Tabs`

**UI kits**
- `ui_kits/wallet/` — interactive mobile wallet (unlock → portfolio → send)
- `ui_kits/website/` — marketing landing page

**Skill**
- `SKILL.md` — makes this folder usable as a downloadable Agent Skill.

---

## Caveats / substitutions
- **Fonts are loaded from CDN, not self-hosted.** General Sans (Fontshare) and Inter + JetBrains Mono (Google Fonts) are pulled via `@import` in `tokens/fonts.css`. Phantom's real wordmark uses a proprietary F37 Foundry face that isn't publicly licensable — General Sans is the closest open match. Provide font binaries if you need offline/self-hosted use.
- **Logo & wordmark are placeholders**, not Phantom's actual mascot/type. Replace `assets/logo-mark.svg` and `assets/wordmark.svg` with the real assets.
