Inline alert / toast. Left accent border + tint fill in the semantic color; errors explain, never apologize.

```jsx
<Alert tone="success" title="Sent" onClose={dismiss}>Your transfer is on its way.</Alert>
<Alert tone="error" title="Transfer failed">Insufficient balance — add funds and retry.</Alert>
```

Tones: `success`, `warning`, `error`, `info`. Props: `title`, `icon`, `onClose`.
