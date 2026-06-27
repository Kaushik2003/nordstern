/* Phantom wallet UI kit — screens. Exports to window for index.html. */

const { Button, IconButton, Input, Badge, Avatar, Tabs, Switch, Card } = window.PhantomDesignSystem_a666e0;

/* ---------- shared bits ---------- */
function Mono({ children, style }) {
  return <span style={{ fontFamily: "var(--font-mono)", ...style }}>{children}</span>;
}

const TOKENS = [
  { sym: "SOL", name: "Solana", amt: "12.4002", usd: "2,310.18", chg: "+2.41%", up: true, color: "#9945FF" },
  { sym: "USDC", name: "USD Coin", amt: "4,820.00", usd: "4,820.00", chg: "0.00%", up: true, color: "#2775CA" },
  { sym: "ETH", name: "Ethereum", amt: "1.204", usd: "3,964.55", chg: "-0.82%", up: false, color: "#627EEA" },
  { sym: "JTO", name: "Jito", amt: "318.0", usd: "1,272.40", chg: "+5.10%", up: true, color: "#16C784" },
];

function TokenIcon({ t, size = 40 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "var(--radius-full)", flexShrink: 0,
      background: t.color, color: "#fff", display: "inline-flex", alignItems: "center",
      justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 600,
      fontSize: size * 0.32, border: "1px solid var(--color-border)",
    }}>{t.sym.slice(0, 2)}</span>
  );
}

/* ---------- Lock / connect ---------- */
function LockScreen({ onUnlock }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: 32, textAlign: "center", gap: 8,
      background: "radial-gradient(120% 80% at 50% 0%, #2A2240 0%, var(--color-bg-canvas) 60%)" }}>
      <img src="../../assets/logo-mark.svg" width="84" height="84" alt="Phantom"
        style={{ animation: "wfloat 5s var(--ease-standard) infinite" }} />
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 28, color: "#fff", margin: "20px 0 0", letterSpacing: "-0.02em" }}>Welcome back</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-text-secondary)", margin: "4px 0 24px" }}>Enter your password to unlock</p>
      <div style={{ width: "100%", maxWidth: 280 }}>
        <Input type="password" placeholder="Password" defaultValue="········" />
      </div>
      <div style={{ width: "100%", maxWidth: 280, marginTop: 16 }}>
        <Button fullWidth onClick={onUnlock}>Unlock</Button>
      </div>
      <button onClick={onUnlock} style={{ marginTop: 18, background: "none", border: "none", color: "var(--color-brand-500)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Use Face ID</button>
      <style>{`@keyframes wfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@media(prefers-reduced-motion:reduce){[style*=wfloat]{animation:none!important}}`}</style>
    </div>
  );
}

/* ---------- Home ---------- */
function HomeScreen({ onSend, onOpenToken }) {
  const [tab, setTab] = React.useState("tokens");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--color-bg-canvas)" }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 8px" }}>
        <Avatar initials="AK" size={36} />
        <button style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)", padding: "6px 14px", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Account 1 <span style={{ color: "var(--color-text-secondary)" }}>▾</span>
        </button>
        <IconButton aria-label="Scan" variant="surface" size="sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
        </IconButton>
      </div>

      {/* balance */}
      <div style={{ textAlign: "center", padding: "18px 0 8px" }}>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-secondary)" }}>Total balance</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 40, fontWeight: 500, color: "#fff", letterSpacing: "-0.01em", marginTop: 4 }}>$12,367.13</div>
        <div style={{ marginTop: 8, display: "inline-flex" }}><Badge tone="success">+$284.10 · 2.4%</Badge></div>
      </div>

      {/* actions */}
      <div style={{ display: "flex", justifyContent: "center", gap: 28, padding: "16px 0 20px" }}>
        {[["Receive","M12 5v14M5 12l7 7 7-7"],["Send","M12 19V5M5 12l7-7 7 7"],["Swap","M7 10l5-5 5 5M17 14l-5 5-5-5"],["Buy","M12 5v14M5 12h14"]].map(([label, d], i) => (
          <button key={label} onClick={label === "Send" ? onSend : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer" }}>
            <span style={{ width: 52, height: 52, borderRadius: "var(--radius-full)", background: "var(--color-bg-surface-2)", border: "1px solid var(--color-border)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand-500)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#fff" }}>{label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: "0 18px 12px" }}>
        <Tabs value={tab} onChange={setTab} tabs={[{value:"tokens",label:"Tokens"},{value:"nfts",label:"Collectibles"},{value:"activity",label:"Activity"}]} />
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 10px" }}>
        {tab === "tokens" && TOKENS.map((t) => (
          <button key={t.sym} onClick={() => onOpenToken(t)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", background: "none", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={(e)=>e.currentTarget.style.background="var(--color-bg-surface)"} onMouseLeave={(e)=>e.currentTarget.style.background="none"}>
            <TokenIcon t={t} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "#fff" }}>{t.name}</div>
              <Mono style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{t.amt} {t.sym}</Mono>
            </div>
            <div style={{ textAlign: "right" }}>
              <Mono style={{ fontSize: 15, color: "#fff", display: "block" }}>${t.usd}</Mono>
              <Mono style={{ fontSize: 13, color: t.up ? "var(--color-success)" : "var(--color-error)" }}>{t.chg}</Mono>
            </div>
          </button>
        ))}
        {tab === "nfts" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 8 }}>
            {["#3120","#0876","Mad Lad","SMB"].map((n,i)=>(
              <div key={n} style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                <div style={{ height: 110, background: `linear-gradient(135deg, ${["#AB9FF2","#2EC08B","#7DB8F2","#F2B84B"][i]}, var(--color-brand-900))` }}></div>
                <div style={{ padding: "8px 10px", background: "var(--color-bg-surface)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "#fff" }}>{n}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "activity" && (
          <div style={{ padding: 8 }}>
            {[["Sent SOL","-2.0 SOL","2:14 PM"],["Received USDC","+500 USDC","Yesterday"],["Swapped","ETH → SOL","Mon"]].map(([a,b,c])=>(
              <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 8px", borderBottom: "1px solid var(--color-border)" }}>
                <div><div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#fff" }}>{a}</div><div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-text-secondary)" }}>{c}</div></div>
                <Mono style={{ fontSize: 14, color: "#fff" }}>{b}</Mono>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Send sheet ---------- */
function SendSheet({ token, onClose, onConfirm }) {
  const t = token || TOKENS[0];
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--overlay)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-bg-canvas)", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: "20px 20px 28px", animation: "sheetUp var(--duration-base) var(--ease-bounce)", borderTop: "1px solid var(--color-border)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 999, background: "var(--color-border)", margin: "0 auto 18px" }}></div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 20, color: "#fff", margin: "0 0 18px", textAlign: "center" }}>Send {t.sym}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="To" placeholder="Address or .sol name" defaultValue="vault.sol" />
          <Input label="Amount" defaultValue="2.0" helperText={`Available ${t.amt} ${t.sym}`} trailingIcon={<span style={{fontFamily:"var(--font-display)",fontWeight:600,fontSize:13,color:"var(--color-brand-500)"}}>MAX</span>} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 4px 18px", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-secondary)" }}>
          <span>Network fee</span><Mono style={{ color: "#fff" }}>0.000005 SOL</Mono>
        </div>
        <Button fullWidth onClick={onConfirm}>Review &amp; send</Button>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@media(prefers-reduced-motion:reduce){@keyframes sheetUp{from{opacity:0}to{opacity:1}}}`}</style>
    </div>
  );
}

Object.assign(window, { LockScreen, HomeScreen, SendSheet, TOKENS });
