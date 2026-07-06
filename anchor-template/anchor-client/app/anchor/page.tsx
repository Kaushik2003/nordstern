import Link from 'next/link';
import { Logo, Button, Card, Badge } from '@/components/ui';

const FEATURES = [
  { icon: '⚙️', title: 'SEP servers, run for you', desc: 'SEP-1/10/12/24 on the Stellar Anchor Platform — discovery, auth, KYC, and hosted deposit/withdrawal. You never touch the protocol.' },
  { icon: '🛡️', title: 'Isolated per anchor', desc: 'Every anchor you create gets its own stack, subdomain, keys, asset, and database. No shared blast radius.' },
  { icon: '🪪', title: 'Pluggable KYC', desc: 'Identity verification behind a clean seam — mock by default, surepass (India) in sandbox, more providers on the way.' },
  { icon: '🔑', title: 'Keys encrypted at rest', desc: 'Signing, distribution, and issuer seeds are generated and sealed in an encrypted vault — never stored in plaintext.' },
];

const STEPS = [
  { n: 1, t: 'Create your operator account', d: 'One login. From it you create and manage every anchor you run.' },
  { n: 2, t: 'Name an anchor & pick KYC', d: 'Give it a name, choose a KYC provider. That’s the whole form.' },
  { n: 3, t: 'Watch it provision live', d: 'Keypairs, testnet funding, asset issuance, config, containers, health — streamed to your screen.' },
  { n: 4, t: 'Go live on its own domain', d: 'Your anchor answers SEP requests at its own subdomain. Wallets can connect immediately.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/anchor/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/anchor/signup"><Button size="sm">Start free</Button></Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="aurora">
        <div className="mx-auto max-w-3xl px-6 pt-20 pb-24 text-center">
          <Badge tone="brand" className="mb-6">Stellar anchor infrastructure</Badge>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Become a Stellar anchor.<br />
            <span className="text-brand-deep">Skip the stack.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Bring your liquidity and licence. NordStern runs the SEP servers, KYC, keys,
            and payment rails — and spins up a fully isolated anchor for you in minutes.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/anchor/signup"><Button size="lg">Launch an anchor — free on testnet</Button></Link>
            <Link href="/anchor/login"><Button variant="outline" size="lg">Sign in</Button></Link>
          </div>
          <p className="mt-4 text-xs text-faint">Testnet only · no card · no real money</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(f => (
            <Card key={f.title} className="p-6">
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold">From sign-up to live anchor</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted">
          The whole point: you register, and you watch the infrastructure assemble itself.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map(s => (
            <Card key={s.n} className="p-5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-sm font-bold text-brand-deep ring-1 ring-brand/25">{s.n}</div>
              <h3 className="mt-4 text-sm font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/anchor/signup"><Button size="lg">Get started →</Button></Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-faint sm:flex-row">
          <Logo />
          <span>Built on Stellar · SEP-24 · Testnet</span>
        </div>
      </footer>
    </div>
  );
}
