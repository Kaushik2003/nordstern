Pill-shaped call-to-action button — use for any primary or secondary action; one accent color, friendly rounding.

```jsx
<Button variant="primary" onClick={connect}>Connect wallet</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost" size="sm">Learn more</Button>
```

Variants: `primary` (purple fill, dark text), `secondary` (bordered), `destructive` (red fill), `ghost` (text-only purple). Sizes: `sm` / `md` / `lg`. Props: `fullWidth`, `disabled`, `leadingIcon`, `trailingIcon`. Hover scales to 1.02 with a brand glow; press shrinks to 0.97.
