# Wallet App — UI Kit

Interactive mobile-wallet recreation in the Phantom-inspired style. Composes the system's component primitives (`Button`, `Input`, `Badge`, `Avatar`, `Tabs`, `Alert`).

**Flow:** Lock / unlock → portfolio home (balance, quick actions, Tokens / Collectibles / Activity tabs) → Send bottom-sheet → success toast.

## Files
- `index.html` — phone frame + app state machine (lock → home → send → toast)
- `screens.jsx` — `LockScreen`, `HomeScreen`, `SendSheet`, plus the `TOKENS` sample data

## Notes
- Dark theme (`data-theme="dark"`), 390px design width.
- Token/NFT data and balances are mock values for demonstration.
- Real Phantom screens use the proprietary brand mascot + type; the ghost mark here is a placeholder.
