---
name: phantom-design
description: Use this skill to generate well-branded interfaces and assets in the Phantom-inspired style (friendly, rounded, confident, purple), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Where things live
- `readme.md` — full design guide: brand essence, content fundamentals, visual foundations, iconography, component list. **Read this first.**
- `styles.css` — the single stylesheet to link; it `@import`s all tokens + fonts.
- `tokens/` — CSS custom properties (colors, type, spacing, radius, motion) + font `@import`s.
- `components/` — React primitives (`Button`, `IconButton`, `Input`, `Switch`, `Card`, `Badge`, `Avatar`, `Alert`, `Dialog`, `Tabs`). Each has a `.prompt.md` with usage.
- `ui_kits/` — full-screen recreations (mobile wallet, marketing site) showing the system composed.
- `guidelines/` — foundation specimen cards.
- `assets/` — logo/wordmark (placeholders — replace with real brand assets).

## Quick rules of thumb
- One warm purple (`#AB9FF2`) does the accent work; near-black `#1A1A1A` canvas (dark theme default). Light theme via `[data-theme="light"]`.
- Large friendly radii: 16px default, 24px cards, 999px buttons/badges.
- Purple-tinted shadows, not black. Brand glow ring for focus.
- General Sans (display) / Inter (body) / JetBrains Mono (all numbers).
- Copy: plain, warm, sentence case, second person; exact mono numbers; errors explain not apologize.
- Motion: scale 1.02 hover / 0.97 press; bouncy modal entrance; respect reduced-motion.
