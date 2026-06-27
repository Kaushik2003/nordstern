Centered modal. Overlay backdrop, 16px radius, scales in with a bounce.

```jsx
<Dialog open={open} onClose={close} title="Connect a wallet" width={350}>
  <Button fullWidth>Continue</Button>
</Dialog>
```

Props: `open`, `onClose`, `title`, `width` (420 dialog / 350 connect box). Click outside to dismiss; respects reduced-motion.
