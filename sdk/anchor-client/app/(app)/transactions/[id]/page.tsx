'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock, XCircle, LifeBuoy } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Badge, Skeleton, Button, type Tone } from '@/components/ui';
import { myTransaction, type CustomerTx } from '@/lib/anchor';
import { inr, dateTime } from '@/lib/format';

const PHASE: Record<string, { label: string; tone: Tone }> = {
  completed: { label: 'Completed', tone: 'success' },
  awaiting_payment: { label: 'Awaiting payment', tone: 'warning' },
  processing: { label: 'Processing', tone: 'info' },
  completing: { label: 'Almost done', tone: 'info' },
  failed: { label: 'Failed', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const brand = useBrand();
  const router = useRouter();
  const [tx, setTx] = useState<CustomerTx | null | undefined>(undefined);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () => myTransaction(id).then((t) => { if (alive) setTx(t); }).catch(() => { if (alive) setTx(null); });
    load();
    // Keep refreshing while non-terminal.
    const iv = setInterval(() => { if (tx && ['completed', 'failed', 'refunded'].includes(tx.phase)) return; load(); }, 4000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (tx === undefined) return <div className="space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-40 w-full" /></div>;
  if (tx === null) return (
    <div className="space-y-4">
      <BackBtn onClick={() => router.push('/transactions')} />
      <Card><CardBody className="py-16 text-center text-sm text-muted">This transaction couldn’t be found.</CardBody></Card>
    </div>
  );

  const p = PHASE[tx.phase] ?? { label: tx.phase, tone: 'neutral' as Tone };
  const Icon = tx.kind === 'buy' ? ArrowDownToLine : ArrowUpFromLine;
  const done = tx.phase === 'completed';
  const failed = tx.phase === 'failed' || tx.phase === 'refunded';
  const StatusIcon = done ? CheckCircle2 : failed ? XCircle : Clock;
  const statusColor = done ? 'text-[var(--color-success)]' : failed ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]';
  const asset = tx.assetCode ?? brand.assetCode;

  return (
    <div className="space-y-5">
      <BackBtn onClick={() => router.push('/transactions')} />

      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <StatusIcon className={`h-14 w-14 ${statusColor}`} />
        <p className="text-2xl font-bold text-ink">
          {tx.kind === 'buy' ? 'Bought' : 'Sold'} {tx.assetAmount} {asset}
        </p>
        <Badge tone={p.tone}>{p.label}</Badge>
      </div>

      <Card><CardBody className="space-y-3">
        <Row label={tx.kind === 'buy' ? 'You paid' : 'You received'} value={inr(tx.inrAmount)} />
        <Row label="Amount" value={`${tx.assetAmount ?? '—'} ${asset}`} />
        <Row label="Reference" value={tx.reference ?? '—'} mono />
        <Row label="Started" value={dateTime(tx.createdAt)} />
        {tx.completedAt && <Row label="Completed" value={dateTime(tx.completedAt)} />}
      </CardBody></Card>

      <Link href="/support"><Button variant="outline" size="block"><LifeBuoy className="h-4 w-4" /> Get help with this</Button></Link>

      {/* Technical details, hidden unless expanded. */}
      <div className="text-center">
        <button onClick={() => setAdvanced(!advanced)} className="text-xs text-faint hover:text-muted">{advanced ? 'Hide' : 'Advanced'} details</button>
      </div>
      {advanced && (
        <Card><CardBody className="space-y-1 font-mono text-[11px] text-muted">
          <div className="break-all">id: {tx.id}</div>
          <div>status: {tx.rawStatus}</div>
          {tx.stellarId && <div className="break-all">chain ref: {tx.stellarId}</div>}
          {tx.destination && <div className="break-all">wallet: {tx.destination}</div>}
        </CardBody></Card>
      )}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Activity</button>;
}
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={`font-medium text-ink ${mono ? 'font-mono text-sm' : ''}`}>{value}</span>
    </div>
  );
}
