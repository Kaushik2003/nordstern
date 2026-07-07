'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

// Maps SEP-24 statuses to the money-semantic badge palette (shared design tokens).
export function StatusPill({ status }: { status: string }) {
  const v = status === 'completed' ? 'up' : status === 'error' ? 'down' : status.startsWith('pending') || status === 'incomplete' ? 'pending' : 'muted';
  return <Badge variant={v}>{status.replace(/_/g, ' ')}</Badge>;
}

const amt = (v: unknown) => {
  const a = (v as { amount?: string } | null)?.amount;
  return a ? parseFloat(a).toFixed(2) : null;
};

export function TxStatusCard({ txData, assetCode, kind }: { txData: Record<string, unknown>; assetCode: string; kind: string }) {
  const inAmt = amt(txData.amount_in);
  const outAmt = amt(txData.amount_out);
  const done = txData.status === 'completed' || txData.status === 'error';
  const stellarTx = Array.isArray(txData.stellar_transactions) ? (txData.stellar_transactions as Record<string, string>[])[0] : null;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink">Your transaction</h3>
        <StatusPill status={String(txData.status ?? '—')} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Type"><span className="capitalize text-ink">{String(txData.kind ?? kind)}</span></Field>
        {inAmt && <Field label="Amount in"><span className="font-semibold text-ink">{inAmt} {assetCode}</span></Field>}
        {outAmt && <Field label="Amount out"><span className="font-semibold text-ink">{outAmt} {assetCode}</span></Field>}
      </div>

      <div className="mt-4 space-y-2 border-t border-line pt-4">
        <Field label="Reference"><span className="break-all font-mono text-xs text-muted">{String(txData.id ?? '—')}</span></Field>
        {stellarTx?.id && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${stellarTx.id}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
          >
            View on Stellar Expert <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {txData.message != null && <p className="text-sm text-[var(--color-down)]">{String(txData.message)}</p>}
        {!done && (
          <p className="flex items-center gap-2 text-xs text-subtle">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" /> Updating…
          </p>
        )}
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-subtle">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
