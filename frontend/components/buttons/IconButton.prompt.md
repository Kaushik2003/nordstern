Single-icon button for toolbars, nav, and card actions — always pass `aria-label`.

```jsx
<IconButton aria-label="Copy address" variant="surface"><CopyIcon /></IconButton>
<IconButton aria-label="Settings" variant="ghost" round={false}><GearIcon /></IconButton>
```

Variants: `surface` (raised), `brand` (purple), `ghost`. Sizes `sm`/`md`/`lg` (32/40/48px). Scales on hover/press.
