'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, Coins, ShieldAlert, ArrowUpToLine, Loader2 } from 'lucide-react';
import { bizGet, bizPost, ApiError } from '@/lib/api';
import { useAnchor } from '@/components/anchor-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stat } from '@/components/ui/stat';
import { num } from '@/lib/format';
import { useState } from 'react';

interface Summary { treasury: { address: string; usdc: string | null; xlm: string | null }; asset: { code: string } }
interface Strategy { emergencyStop?: boolean; [k: string]: unknown }

export default function TreasuryPage() {
  const { assetCode } = useAnchor();
  const qc = useQueryClient();
  const [note, setNote] = useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);

  const summary = useQuery({ queryKey: ['summary'], queryFn: () => bizGet<Summary>('/admin/summary'), refetchInterval: 15000 });
  const strategy = useQuery({ queryKey: ['strategy'], queryFn: () => bizGet<Strategy>('/admin/strategy') });
  const paused = strategy.data?.emergencyStop === true;

  const pause = useMutation({
    mutationFn: () => bizPost('/admin/treasury/pause'),
    onSuccess: () => { setNote({ tone: 'success', msg: paused ? 'Anchor resumed.' : 'Anchor paused — new money movement is halted.' }); qc.invalidateQueries({ queryKey: ['strategy'] }); },
    onError: (e) => setNote({ tone: 'danger', msg: e instanceof ApiError ? e.message : 'Failed' }),
  });
  const sweep = useMutation({
    mutationFn: () => bizPost('/admin/treasury/sweep'),
    onSuccess: () => setNote({ tone: 'success', msg: 'Sweep recorded.' }),
    onError: (e) => setNote({ tone: 'danger', msg: e instanceof ApiError ? e.message : 'Failed' }),
  });

  const busy = summary.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Treasury</h1>
        <p className="text-sm text-subtle">Your {assetCode} float and the emergency controls that govern money movement.</p>
      </div>

      {note && (
        <div className={`rounded-lg px-3 py-2 text-sm ${note.tone === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>{note.msg}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label={`${assetCode} float`} value={<>{num(summary.data?.treasury.usdc)} <span className="text-sm font-medium text-subtle">{assetCode}</span></>} sub="available for on-ramp payouts" icon={Wallet} loading={busy} />
        <Stat label="XLM (network fees)" value={num(summary.data?.treasury.xlm)} sub="keeps the anchor transacting" icon={Coins} loading={busy} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Treasury account</CardTitle></CardHeader>
        <CardContent>
          <p className="break-all font-mono text-xs text-subtle">{summary.data?.treasury.address ?? '—'}</p>
        </CardContent>
      </Card>

      {/* Emergency pause — the real money-safety switch (flips strategy.emergencyStop). */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-[var(--color-danger)]" /> Emergency controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Money movement</p>
              <p className="text-xs text-subtle">Pause halts new deposits and withdrawals immediately.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={paused ? 'danger' : 'success'}>{paused ? 'Paused' : 'Active'}</Badge>
              <Button
                variant={paused ? 'brand' : 'destructive'}
                size="sm"
                disabled={pause.isPending || strategy.isLoading}
                onClick={() => { if (confirm(paused ? 'Resume money movement?' : 'Pause ALL money movement for this anchor?')) pause.mutate(); }}
              >
                {pause.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {paused ? 'Resume' : 'Pause anchor'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Sweep settled funds</p>
              <p className="text-xs text-subtle">Records a treasury sweep to the corporate account.</p>
            </div>
            <Button variant="outline" size="sm" disabled={sweep.isPending} onClick={() => sweep.mutate()}>
              {sweep.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpToLine className="h-4 w-4" />} Sweep
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
