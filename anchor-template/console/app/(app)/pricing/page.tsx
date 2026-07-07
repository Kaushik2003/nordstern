'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2, AlertTriangle } from 'lucide-react';
import { bizGet, bizPost, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Mirrors the real nordstern.strategy_config JSON. We only expose the fields the backend
// actually stores; anything unknown is preserved untouched on save (POST replaces the
// whole config as a new version).
interface Strategy {
  percentageFee?: number;
  fixedFee?: number;
  minDeposit?: number;
  maxDeposit?: number;
  maxSingleTx?: number;
  dailyVolumeLimit?: number;
  autoPauseThreshold?: number;
  riskScoreThreshold?: number;
  settlementBufferMin?: number;
  emergencyStop?: boolean;
  maintenanceMode?: boolean;
  feeTiers?: { fee: number; limit: number }[];
  supportedRails?: string[];
  [k: string]: unknown;
}

const FIELDS: { key: keyof Strategy; label: string; hint: string; unit?: string }[] = [
  { key: 'percentageFee', label: 'Fee (percentage)', hint: 'Charged on each transaction', unit: '%' },
  { key: 'fixedFee', label: 'Fixed fee', hint: 'Flat fee per transaction', unit: '₹' },
  { key: 'minDeposit', label: 'Minimum deposit', hint: 'Smallest allowed deposit', unit: '₹' },
  { key: 'maxDeposit', label: 'Maximum deposit', hint: 'Largest allowed deposit', unit: '₹' },
  { key: 'maxSingleTx', label: 'Max single transaction', hint: 'Per-transaction ceiling', unit: '₹' },
  { key: 'dailyVolumeLimit', label: 'Daily volume limit', hint: 'Total per day across all customers', unit: '₹' },
  { key: 'autoPauseThreshold', label: 'Auto-pause threshold', hint: 'Treasury level that triggers auto-pause', unit: '₹' },
  { key: 'riskScoreThreshold', label: 'Risk score threshold', hint: 'Score above which a case is flagged' },
  { key: 'settlementBufferMin', label: 'Settlement buffer', hint: 'Minutes held before settlement', unit: 'min' },
];

export default function PricingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['strategy'], queryFn: () => bizGet<Strategy>('/admin/strategy') });
  const [draft, setDraft] = useState<Strategy | null>(null);
  const [note, setNote] = useState<{ tone: 'success' | 'danger'; msg: string } | null>(null);

  useEffect(() => { if (data && !draft) setDraft(data); }, [data, draft]);

  const save = useMutation({
    mutationFn: (cfg: Strategy) => bizPost<{ version: number }>('/admin/strategy', cfg),
    onSuccess: (r) => { setNote({ tone: 'success', msg: `Saved as version ${r.version}.` }); qc.invalidateQueries({ queryKey: ['strategy'] }); },
    onError: (e) => setNote({ tone: 'danger', msg: e instanceof ApiError ? e.message : 'Save failed' }),
  });

  const dirty = draft && data && JSON.stringify(draft) !== JSON.stringify(data);

  if (isLoading || !draft) {
    return <div className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-8 w-48" />{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  const setField = (k: keyof Strategy, v: number) => setDraft({ ...draft, [k]: v });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Pricing &amp; Limits</h1>
          <p className="text-sm text-subtle">Fees, deposit limits, and safety thresholds. Saved as a new versioned policy.</p>
        </div>
        <Button variant="brand" size="sm" disabled={!dirty || save.isPending} onClick={() => draft && save.mutate(draft)}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </Button>
      </div>

      {note && (
        <div className={`rounded-lg px-3 py-2 text-sm ${note.tone === 'success' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>{note.msg}</div>
      )}
      {draft.emergencyStop && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <AlertTriangle className="h-4 w-4" /> Emergency stop is ON — money movement is paused. Manage in Treasury.
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Fees &amp; limits</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={String(f.key)} className="block">
              <span className="text-sm font-medium text-ink">{f.label}</span>
              <span className="mt-0.5 block text-xs text-subtle">{f.hint}</span>
              <div className="mt-1.5 flex items-center rounded-lg border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                {f.unit === '₹' && <span className="text-sm text-subtle">₹</span>}
                <input
                  type="number"
                  step="any"
                  value={Number(draft[f.key] ?? 0)}
                  onChange={(e) => setField(f.key, Number(e.target.value))}
                  className="w-full bg-transparent py-2 text-sm text-ink outline-none"
                />
                {f.unit && f.unit !== '₹' && <span className="text-sm text-subtle">{f.unit}</span>}
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {draft.feeTiers?.length ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Fee tiers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {draft.feeTiers.map((t, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                <span className="text-subtle">Up to ₹{t.limit.toLocaleString()}</span>
                <span className="font-medium text-ink">{t.fee}% fee</span>
              </div>
            ))}
            <p className="text-xs text-subtle">Tier editing coming next — current tiers are preserved on save.</p>
          </CardContent>
        </Card>
      ) : null}

      {draft.supportedRails?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-subtle">Supported rails:</span>
          {draft.supportedRails.map((r) => <Badge key={r} tone="info">{r}</Badge>)}
        </div>
      ) : null}
    </div>
  );
}
