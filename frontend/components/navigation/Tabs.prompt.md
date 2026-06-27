Segmented pill tabs inside a rounded container. Active tab gets a brand-tint pill.

```jsx
const [tab, setTab] = React.useState("tokens");
<Tabs value={tab} onChange={setTab}
  tabs={[{value:"tokens",label:"Tokens"},{value:"nfts",label:"NFTs"},{value:"activity",label:"Activity"}]} />
```

Accepts plain strings or `{value,label}` objects.
