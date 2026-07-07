'use client';

import { useBrand } from '@/components/brand-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, Loader2 } from 'lucide-react';

// Sticky branded header: monogram + business name, network badge, and wallet state
// (Connect CTA when disconnected; truncated address pill when connected).
export function Header({
  address, connecting, onConnect, isMainnet,
}: { address: string | null; connecting: boolean; onConnect: () => void; isMainnet: boolean }) {
  const brand = useBrand();
  const initial = brand.name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-ink">{initial}</div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">{brand.name}</span>
        </div>
        {!isMainnet && <Badge variant="brand" className="hidden sm:inline-flex">Testnet</Badge>}
        <span className="flex-1" />
        {!address ? (
          <Button variant="brand" size="sm" onClick={onConnect} disabled={connecting}>
            {connecting ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</> : <><Wallet className="h-4 w-4" /> Connect wallet</>}
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--color-up)]" />
            <span className="font-mono text-xs text-muted">{address.slice(0, 6)}…{address.slice(-4)}</span>
          </div>
        )}
      </div>
    </header>
  );
}
