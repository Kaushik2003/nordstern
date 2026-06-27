/* Phantom marketing site UI kit — sections. Exports to window. */
const { Button, Badge, Card, Avatar } = window.PhantomDesignSystem_a666e0;

function Nav() {
  const links = ["Features", "Security", "Developers", "Support"];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 30, backdropFilter: "blur(16px)", background: "rgba(26,26,26,0.78)", borderBottom: "1px solid var(--color-border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 24 }}>
        <img src="../../assets/wordmark.svg" alt="Phantom" height="30" />
        <nav style={{ display: "flex", gap: 4, marginLeft: 12, background: "var(--color-bg-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)", padding: 4 }}>
          {links.map((l, i) => (
            <a key={l} href="#" style={{ padding: "8px 16px", borderRadius: "var(--radius-full)", textDecoration: "none", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: i === 0 ? "var(--color-brand-500)" : "var(--color-text-secondary)", background: i === 0 ? "rgba(171,159,242,0.12)" : "transparent" }}>{l}</a>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <Button variant="ghost" size="sm">Sign in</Button>
          <Button size="sm">Download</Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", textAlign: "center", padding: "96px 24px 80px" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 60% at 50% 0%, rgba(171,159,242,0.28) 0%, rgba(60,49,91,0.0) 60%)", pointerEvents: "none" }}></div>
      <div style={{ position: "relative", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "inline-flex", marginBottom: 24 }}><Badge tone="brand">✨ Now with multi-chain swaps</Badge></div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 64, lineHeight: "68px", letterSpacing: "-0.02em", color: "#fff", margin: 0 }}>A crypto wallet that feels<br/>like it's on your side</h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 19, lineHeight: "28px", color: "var(--color-text-secondary)", maxWidth: 560, margin: "20px auto 32px" }}>Manage tokens, NFTs, and swaps across chains — with the friendly, secure wallet millions already trust.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Button size="lg">Download Phantom</Button>
          <Button size="lg" variant="secondary">See how it works</Button>
        </div>
        <div style={{ marginTop: 56, position: "relative", maxWidth: 320, margin: "56px auto 0" }}>
          <img src="../../assets/logo-mark.svg" width="120" height="120" style={{ margin: "0 auto", display: "block", animation: "hfloat 6s var(--ease-standard) infinite" }} alt=""/>
        </div>
      </div>
      <style>{`@keyframes hfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@media(prefers-reduced-motion:reduce){@keyframes hfloat{0%,100%{transform:none}}}`}</style>
    </section>
  );
}

function Features() {
  const feats = [
    ["Send money, simply", "Transfer to any wallet or .sol name in seconds. No jargon, no guesswork.", "M12 19V5M5 12l7-7 7 7"],
    ["Swap across chains", "Trade tokens on Solana, Ethereum, and more — right inside your wallet.", "M7 10l5-5 5 5M17 14l-5 5-5-5"],
    ["Secure by default", "Biometric lock, spam detection, and transaction previews on every action.", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  ];
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px 96px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 36, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", margin: "0 0 8px" }}>Everything in one friendly place</h2>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--color-text-secondary)", textAlign: "center", margin: "0 0 48px" }}>Built so crypto feels approachable, not intimidating.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {feats.map(([t, d, icon]) => (
          <Card key={t} interactive padding={32}>
            <span style={{ width: 52, height: 52, borderRadius: "var(--radius-md)", background: "rgba(171,159,242,0.16)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand-500)", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
            </span>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, color: "#fff", margin: "0 0 8px" }}>{t}</h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: "23px", color: "var(--color-text-secondary)", margin: 0 }}>{d}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto 80px", padding: "0 24px" }}>
      <div style={{ borderRadius: "var(--radius-xl)", background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-900))", padding: "64px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 44, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 12px" }}>Ready when you are</h2>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "rgba(255,255,255,0.85)", margin: "0 0 28px" }}>Free to download. Yours to control.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Button size="lg" style={{ background: "#fff", color: "var(--color-brand-900)" }}>Download for iOS</Button>
          <Button size="lg" style={{ background: "rgba(0,0,0,0.25)", color: "#fff" }}>Download for Android</Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = { Product: ["Download", "Features", "Security"], Company: ["About", "Careers", "Blog"], Resources: ["Help", "Developers", "Status"] };
  return (
    <footer style={{ borderTop: "1px solid var(--color-border)", padding: "48px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32 }}>
        <div>
          <img src="../../assets/wordmark.svg" alt="Phantom" height="28" />
          <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-text-secondary)", marginTop: 14, maxWidth: 240 }}>The friendly crypto wallet. © 2026.</p>
        </div>
        {Object.entries(cols).map(([h, items]) => (
          <div key={h}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "#fff", marginBottom: 14 }}>{h}</div>
            {items.map((it) => <a key={it} href="#" style={{ display: "block", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-text-secondary)", textDecoration: "none", marginBottom: 10 }}>{it}</a>)}
          </div>
        ))}
      </div>
    </footer>
  );
}

Object.assign(window, { Nav, Hero, Features, CTA, Footer });
