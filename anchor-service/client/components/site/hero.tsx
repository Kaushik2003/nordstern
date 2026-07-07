'use client';

import { useBrand } from '@/components/brand-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Aurora } from '@/components/motion/aurora';
import { Reveal } from '@/components/motion/reveal';
import { Stagger, StaggerItem } from '@/components/motion/stagger';
import { Wallet, ShieldCheck, Zap, Loader2, ArrowRight } from 'lucide-react';

// Disconnected landing: branded hero + "how it works". Reuses the landing's motion
// language (Aurora, Reveal, Stagger). CTA connects the wallet.
export function Hero({
  connecting, onConnect, connectMsg,
}: { connecting: boolean; onConnect: () => void; connectMsg: string }) {
  const brand = useBrand();

  const steps = [
    { icon: Wallet, title: 'Connect your wallet', body: 'Link a Stellar wallet like Freighter. Non-custodial — you always hold your keys.' },
    { icon: ShieldCheck, title: `Verify once`, body: `Complete identity verification a single time, reusable across the NordStern network.` },
    { icon: Zap, title: `Buy ${brand.assetCode}`, body: `Pay in ${brand.currency} and receive ${brand.assetCode} on Stellar in seconds.` },
  ];

  return (
    <section className="relative overflow-hidden">
      <Aurora intensity="soft" />
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-28">
        <Reveal>
          <Badge variant="outline" className="mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {brand.currency} → {brand.assetCode} · powered by NordStern
          </Badge>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Buy {brand.assetCode} with {brand.name}
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            The fast, compliant way to move between {brand.currency} and {brand.assetCode} on Stellar — no exchange account, no custody.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Button variant="brand" size="lg" onClick={onConnect} disabled={connecting}>
              {connecting ? <><Loader2 className="h-5 w-5 animate-spin" /> Connecting…</> : <><Wallet className="h-5 w-5" /> Connect wallet to start</>}
            </Button>
            {connectMsg && (
              <p className={`text-sm ${connectMsg.startsWith('❌') ? 'text-[var(--color-down)]' : 'text-muted'}`}>{connectMsg}</p>
            )}
            <p className="text-xs text-subtle">
              New to Stellar wallets?{' '}
              <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                Get Freighter <ArrowRight className="inline h-3 w-3" />
              </a>
            </p>
          </div>
        </Reveal>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <StaggerItem key={s.title}>
              <div className="h-full rounded-mock border border-line bg-white p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
