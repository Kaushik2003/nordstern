Controlled on/off toggle. Track turns brand-purple when on; knob slides with a bounce.

```jsx
const [on, setOn] = React.useState(true);
<Switch checked={on} onChange={setOn} label="Hide balances" />
```

Props: `checked`, `onChange(next)`, `disabled`, `label`.
