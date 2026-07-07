'use client';

import { useBrand } from '@/components/brand-context';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Reveal } from '@/components/motion/reveal';
import { Coins, Receipt, LifeBuoy, ArrowUpRight } from 'lucide-react';

// Informational sections shared across states: Supported Assets, Fees & Limits, Support.
// Reuses Card/Badge/Reveal. Numbers are anchor-configured; shown as clear ranges.
export function InfoSections() {
  const brand = useBrand();
  return (
    <section className="mx-auto max-w-6xl space-y-10 px-5 py-16 sm:px-8">
      {/* Supported assets */}
      <Reveal>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Supported assets</h2>
          <p className="mt-1 text-sm text-muted">Assets you can buy and sell with {brand.name}.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Card className="flex items-center gap-4 p-5" interactive>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-800">
                <Coins className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{brand.assetCode}</p>
                  <Badge variant="up">Live</Badge>
                </div>
                <p className="text-sm text-muted">Stellar asset · settles in {brand.currency}</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4 p-5 opacity-70">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-subtle">
                <Coins className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">More assets</p>
                  <Badge variant="muted">Soon</Badge>
                </div>
                <p className="text-sm text-muted">Additional corridors are on the way.</p>
              </div>
            </Card>
          </div>
        </div>
      </Reveal>

      {/* Fees & limits */}
      <Reveal>
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink">
            <Receipt className="h-5 w-5 text-subtle" /> Fees &amp; limits
          </h2>
          <p className="mt-1 text-sm text-muted">Transparent, set by {brand.name}. Final fees are shown before you confirm.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { k: 'Network', v: 'Stellar', s: 'Fast, low-cost settlement' },
              { k: 'Fee', v: 'Shown at checkout', s: 'No hidden charges' },
              { k: 'Limits', v: 'Per anchor policy', s: 'Increase with verification' },
            ].map((f) => (
              <Card key={f.k} className="p-5">
                <p className="text-xs uppercase tracking-wide text-subtle">{f.k}</p>
                <p className="mt-1 text-lg font-semibold text-ink">{f.v}</p>
                <p className="text-sm text-muted">{f.s}</p>
              </Card>
            ))}
          </div>
        </div>
      </Reveal>

      {/* Support */}
      <Reveal>
        <Card tone="surface" className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-800">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-ink">Need help?</p>
              <p className="text-sm text-muted">Our support team is here for any question about your transaction.</p>
            </div>
          </div>
          <a
            href="mailto:support@nordstern.live"
            className="inline-flex items-center gap-1.5 rounded-pill bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90"
          >
            Contact support <ArrowUpRight className="h-4 w-4" />
          </a>
        </Card>
      </Reveal>
    </section>
  );
}
