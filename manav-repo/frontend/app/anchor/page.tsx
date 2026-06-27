'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span className="text-blue-400">⚓</span> Dockyard
        </div>
        <div className="flex gap-4">
          <Link href="/anchor/login" className="text-slate-400 hover:text-white text-sm">Login</Link>
          <Link href="/anchor/signup" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full mb-6">
          Powered by Stellar Network
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Deploy a Stellar anchor<br />
          <span className="text-blue-400">in 60 seconds.</span>
        </h1>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">
          Full SEP-24 compliance, fiat reconciliation, and real-time monitoring —
          without the $300,000 integration cost.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/anchor/signup" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-medium text-lg transition-colors">
            Start Building — Free on Testnet
          </Link>
          <Link href="/anchor/login" className="border border-slate-700 hover:border-slate-500 text-slate-300 px-8 py-4 rounded-xl font-medium text-lg transition-colors">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: '⚡',
            title: '60-second deployment',
            desc: 'Keypairs generated, funded, trustline set up, ANCH minted. Your anchor is live before your coffee is ready.',
          },
          {
            icon: '🔄',
            title: 'Live reconciliation',
            desc: 'On-chain ANCH vs fiat reserve checked every minute. Red banner the moment they diverge — before it becomes a problem.',
          },
          {
            icon: '⚙️',
            title: 'Your business rules',
            desc: 'Set deposit limits, fees, fiat wire details, KYC tiers, and webhook alerts — all configurable from your dashboard.',
          },
        ].map(f => (
          <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="text-3xl mb-4">{f.icon}</div>
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800 max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <div className="flex flex-col md:flex-row gap-2 items-center justify-center text-sm">
          {['Sign up', 'Generate keypairs', 'Auto-fund & mint', 'Go live', 'Monitor & reconcile'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
              <span className="text-slate-300">{step}</span>
              {i < 4 && <span className="text-slate-700 mx-2 hidden md:block">→</span>}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 text-center py-8 text-slate-600 text-sm">
        Built on Stellar · SEP-24 compliant · Hackathon MVP
      </footer>
    </div>
  );
}
