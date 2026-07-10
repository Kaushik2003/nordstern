'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  ArrowDownLeft, ArrowUpRight, Users, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { bizGet } from '@/lib/api';
import { useAnchor } from '@/components/anchor-context';
import { num, inr, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

// Real anchor data from this anchor's business-server (/biz/admin/summary). Every number here
// is derived from actual transactions, the Platform DB, and Horizon — nothing is fabricated.
interface Summary {
  network: string;
  asset: { code: string; issuer: string; id: string };
  treasury: { address: string; usdc: string | null; xlm: string | null };
  rate?: { inrPerUsdc: string; usdInr?: string; xlmUsd?: string; xlmInr?: string; source?: string; asOf?: string };
  counts: { total: number; deposits: number; withdrawals: number; completed: number; pending: number };
  volume: { inrCollected: string; usdcDeposited: string; usdcWithdrawn: string; inrPaidOut: string };
  metrics: { tokensInCirculation: string; netFiatCollected: string; avgSettlementMinutes: string | null; netFlow24h: string; dailyOutflow: string };
  movementSeries: { date: string; inflow: string; outflow: string }[];
  attention: {
    withdrawalsAwaitingPayout: { count: number; amount: string };
    depositsPending: { count: number; amount: string };
    payoutFailed: { count: number; amount: string };
  };
  recent: { id: string; kind: string; dir: 'in' | 'out'; ref: string; status: string; inr: string | null; asset: string | null; startedAt: string | null; completedAt: string | null }[];
  reserveAccounts: { distribution: { address: string; assetBalance: string | null; xlm: string | null }; issuer: { address: string } };
  providers: { kyc: string; deposit: string; payout: string };
  health: Record<string, string>;
}

// ── Load-in cascade (mirrors the landing console mock) ──────────────────────────
const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const reveal = (delay: number): React.CSSProperties => ({ animation: `console-reveal 0.55s ${EASE} ${delay}s backwards` });
const draw = (delay: number): React.CSSProperties => ({ animation: `console-draw 1.3s ease-out ${delay}s both` });
const T = { header: 0.02, kpi: 0.08, kpiStep: 0.08, money: 0.32, chart: 0.5, tx: 0.4, txRow: 0.52, txStep: 0.06, attn: 0.46, attnRow: 0.6, attnStep: 0.07, res: 0.62, health: 0.72 };

const INK = 'text-[#1c1b26]';
const CARD = 'rounded-[20px] border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(24,22,54,0.04),0_10px_30px_-20px_rgba(24,22,54,0.16)]';
const CARD_HOVER = 'transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_5px_rgba(24,22,54,0.05),0_22px_48px_-24px_rgba(34,24,78,0.24)]';

function Card({ className, hover, style, children }: { className?: string; hover?: boolean; style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={style} className={cn(CARD, hover && CARD_HOVER, 'p-5', className)}>{children}</div>;
}

export default function OverviewPage() {
  const { name, assetCode } = useAnchor();
  const { data, isLoading, error } = useQuery({
    queryKey: ['summary'],
    queryFn: () => bizGet<Summary>('/admin/summary'),
    refetchInterval: 15000,
  });

  if (error) {
    return (
      <div className="">
        <Card><p className="py-4 text-sm text-subtle">Live data unavailable — the anchor may still be warming up, or your session lacks operator access.</p></Card>
      </div>
    );
  }

  const m = data?.metrics;
  const avg = m?.avgSettlementMinutes;
  const net = Number(m?.netFlow24h ?? 0);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between" style={reveal(T.header)}>
        <div>
          <p className={cn('text-[17px] font-semibold', INK)}>Overview</p>
          <p className="text-[12px] text-subtle">Operating {name}{data && <> · issuing {data.asset.code} on {data.network}</>}</p>
        </div>
        <p className="text-[11.5px] text-subtle">Live · refreshes every 15s</p>
      </div>

      {/* Live market rates — real feed (XLM / USD / INR), never mocked */}
      {data?.rate && (data.rate.xlmUsd || data.rate.usdInr) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.05] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(24,22,54,0.04)]" style={reveal(T.header + 0.03)}>
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-subtle">Live rates</span>
          <Rate pair="XLM / USD" value={data.rate.xlmUsd ? `$${data.rate.xlmUsd}` : '—'} />
          <Rate pair="XLM / INR" value={data.rate.xlmInr ? `₹${data.rate.xlmInr}` : '—'} />
          <Rate pair="USD / INR" value={data.rate.usdInr ? `₹${data.rate.usdInr}` : '—'} />
          <span className="ml-auto text-[10.5px] text-subtle">
            {data.rate.source ?? 'live'}{data.rate.asOf ? ` · ${relativeTime(new Date(data.rate.asOf).getTime())}` : ''}
          </span>
        </div>
      )}

      {/* KPI row — real balance-sheet + flow metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi style={reveal(T.kpi)} label="Tokens in circulation" value={num(m?.tokensInCirculation)} sub={`${assetCode} · net issued`} loading={isLoading} />
        <Kpi style={reveal(T.kpi + T.kpiStep)} label="Treasury float" value={num(data?.treasury.usdc)} sub={`${assetCode} · ${num(data?.treasury.xlm, 2)} XLM for fees`} loading={isLoading} />
        <Kpi style={reveal(T.kpi + T.kpiStep * 2)} label="Net fiat collected" value={inr(m?.netFiatCollected)} sub="in − out · from settled txns" loading={isLoading} />
        <Kpi style={reveal(T.kpi + T.kpiStep * 3)} label="Net flow · 24h" value={`${net >= 0 ? '+' : ''}${inr(m?.netFlow24h)}`} sub={`out ${inr(m?.dailyOutflow)} today`} accent={net > 0} loading={isLoading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        {/* left — money movement + recent transactions */}
        <div className="space-y-5">
          <Card hover style={reveal(T.money)}>
            <PanelHead title="Money movement" meta={<span className="text-[11.5px] text-subtle">Last 14 days</span>} />
            <div className="mb-4 flex gap-8">
              <Metric label="On-ramp" value={inr(data?.volume.inrCollected)} up />
              <Metric label="Off-ramp" value={inr(data?.volume.inrPaidOut)} />
              <Metric label="Settled · avg" value={avg == null ? '—' : `~${Number(avg) < 1 ? '<1' : Math.round(Number(avg))} min`} />
            </div>
            <FlowChart series={data?.movementSeries ?? []} />
          </Card>

          <Card style={reveal(T.tx)}>
            <PanelHead title="Recent transactions" meta={<Link href="/transactions" className="text-[11.5px] font-medium text-brand-700 hover:underline">View all →</Link>} />
            {isLoading ? (
              <div className="space-y-3 py-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-surface-2/60" />)}</div>
            ) : data && data.recent.length ? (
              <div>{data.recent.map((t, i) => <TxRow key={t.id} t={t} assetCode={assetCode} style={reveal(T.txRow + i * T.txStep)} />)}</div>
            ) : (
              <p className="py-6 text-center text-[12.5px] text-subtle">No transactions yet.</p>
            )}
          </Card>
        </div>

        {/* right — attention, reserves, health */}
        <div className="space-y-5">
          {/* Only shown when something actually needs attention. */}
          {data && attnCount(data) > 0 && (
            <Card style={reveal(T.attn)}>
              <PanelHead title="Needs attention" meta={<span className="text-[11.5px] text-subtle">{attnCount(data)} items</span>} />
              {data.attention.withdrawalsAwaitingPayout.count > 0 && (
                <QueueRow style={reveal(T.attnRow)} Icon={ArrowUpRight} tone="info" label="Withdrawals awaiting payout" meta={`${data.attention.withdrawalsAwaitingPayout.count} pending`} value={inr(data.attention.withdrawalsAwaitingPayout.amount)} href="/transactions?filter=pending" />
              )}
              {data.attention.depositsPending.count > 0 && (
                <QueueRow style={reveal(T.attnRow + T.attnStep)} Icon={ArrowDownLeft} tone="info" label="Deposits pending" meta={`${data.attention.depositsPending.count} transactions`} value={inr(data.attention.depositsPending.amount)} href="/transactions?filter=pending" />
              )}
              {data.attention.payoutFailed.count > 0 && (
                <QueueRow style={reveal(T.attnRow + T.attnStep * 2)} Icon={AlertTriangle} tone="down" label="Payout failed · retry" meta={`${data.attention.payoutFailed.count} to review`} value={inr(data.attention.payoutFailed.amount)} href="/transactions?filter=failed" />
              )}
            </Card>
          )}

          <Card style={reveal(T.res)}>
            <PanelHead title="Reserve accounts" />
            {data && (
              <>
                <AcctRow name="Stellar distribution" meta={`${short(data.reserveAccounts.distribution.address)} · issues ${assetCode}`} badge={assetCode} value={num(data.reserveAccounts.distribution.assetBalance)} />
                <AcctRow name="Issuer account" meta={`${short(data.reserveAccounts.issuer.address)} · asset control`} badge="XLM" value="—" />
              </>
            )}
          </Card>

          <Card style={reveal(T.health)}>
            <PanelHead title="System & providers" meta={<span className="font-mono text-[10px] text-[color:var(--color-up)]">Operational</span>} />
            {data && (
              <>
                <HealthRow ok={data.health.databaseStatus === 'up'} name="Anchor database" status={data.health.databaseStatus} />
                <HealthRow ok={data.health.horizonConnectivity === 'up'} name="Horizon · Stellar" status={data.health.horizonConnectivity} />
                <HealthRow ok={data.health.workerStatus === 'up'} name="Workers · pollers" status={data.health.workerStatus} />
                <HealthRow ok name={`Identity · ${data.providers.kyc}`} status="configured" />
                <HealthRow ok name={`On-ramp · ${data.providers.deposit}`} status="configured" />
                <HealthRow ok name={`Payouts · ${data.providers.payout}`} status="configured" />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const short = (a: string | null) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '—');
const attnCount = (d: Summary) => d.attention.withdrawalsAwaitingPayout.count + d.attention.depositsPending.count + d.attention.payoutFailed.count;

function Kpi({ label, value, sub, accent, loading, style }: { label: string; value: React.ReactNode; sub: string; accent?: boolean; loading?: boolean; style?: React.CSSProperties }) {
  return (
    <Card hover style={style}>
      <p className="text-[12.5px] font-medium text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-3.5 h-7 w-24 animate-pulse rounded bg-surface-2/70" />
      ) : (
        <p className={cn('mt-3.5 text-[27px] font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-[29px]', accent ? 'text-[color:var(--color-up)]' : INK)}>{value}</p>
      )}
      <p className="mt-2.5 text-[11.5px] text-subtle">{sub}</p>
    </Card>
  );
}

function Rate({ pair, value }: { pair: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11.5px]">
      <span className="font-medium text-muted-foreground">{pair}</span>
      <span className="font-semibold tabular-nums text-ink">{value}</span>
    </span>
  );
}

function Metric({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div>
      <p className="text-[11.5px] text-subtle">{label}</p>
      <p className={cn('mt-1 text-[17px] font-medium tabular-nums', up ? 'text-[color:var(--color-up)]' : INK)}>{value}</p>
    </div>
  );
}

function PanelHead({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return <div className="mb-4 flex items-center justify-between"><p className={cn('text-[13.5px] font-medium', INK)}>{title}</p>{meta}</div>;
}

// ── Status pill (real SEP-24 status → tone) ──────────────────────────────────────
function statusPill(status: string): { cls: string; dot: string; label: string } {
  const s = status.toLowerCase();
  if (s === 'completed') return { cls: 'bg-[color:var(--color-up)]/10 text-[color:var(--color-up)]', dot: 'bg-[color:var(--color-up)]', label: 'Completed' };
  if (s === 'error' || s === 'expired') return { cls: 'bg-[color:var(--color-down)]/10 text-[color:var(--color-down)]', dot: 'bg-[color:var(--color-down)]', label: s === 'error' ? 'Failed' : 'Expired' };
  if (s.startsWith('pending_user')) return { cls: 'bg-[#f6eccf] text-[#8a6410]', dot: 'bg-[#c9992e]', label: 'Awaiting user' };
  if (s.startsWith('pending')) return { cls: 'bg-brand/[0.12] text-brand-800', dot: 'bg-brand-700', label: 'Processing' };
  return { cls: 'bg-surface-2 text-muted-foreground', dot: 'bg-subtle', label: status };
}

function TxRow({ t, assetCode, style }: { t: Summary['recent'][number]; assetCode: string; style?: React.CSSProperties }) {
  const s = statusPill(t.status);
  const when = t.startedAt ? relativeTime(new Date(t.startedAt).getTime()).replace(' ago', '') : '—';
  return (
    <div style={style} className="group -mx-5 flex items-center gap-3 rounded-xl px-5 py-3 transition-colors duration-200 hover:bg-[#faf9fe]">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', t.dir === 'in' ? 'bg-[color:var(--color-up)]/10 text-[color:var(--color-up)]' : 'bg-surface-2 text-muted-foreground')}>
        {t.dir === 'in' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[13px] font-medium', INK)}>{t.dir === 'in' ? 'On-ramp' : 'Off-ramp'} · {t.ref}</p>
        <p className="truncate text-[11.5px] text-subtle">{t.kind} · {num(t.asset)} {assetCode}</p>
      </div>
      <span className={cn('w-24 shrink-0 text-right text-[13px] font-medium tabular-nums', t.dir === 'in' ? 'text-[color:var(--color-up)]' : INK)}>
        {t.dir === 'in' ? '+' : '−'}{inr(t.inr)}
      </span>
      <span className="hidden w-32 shrink-0 md:block">
        <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium', s.cls)}>
          <span className={cn('size-1.5 rounded-full', s.dot)} />{s.label}
        </span>
      </span>
      <span className="hidden w-10 shrink-0 text-right text-[11px] text-subtle tabular-nums lg:inline">{when}</span>
    </div>
  );
}

function QueueRow({ Icon, tone, label, meta, value, href, style }: { Icon: React.ComponentType<{ className?: string }>; tone: 'info' | 'warn' | 'down'; label: string; meta: string; value: string; href: string; style?: React.CSSProperties }) {
  const tones = { info: 'bg-brand/[0.12] text-brand-800', warn: 'bg-[#f6eccf] text-[#8a6410]', down: 'bg-[color:var(--color-down)]/10 text-[color:var(--color-down)]' };
  return (
    <Link href={href} style={style} className="group -mx-5 flex items-center gap-3 rounded-xl px-5 py-2.5 transition-colors duration-200 hover:bg-[#faf9fe]">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-[11px]', tones[tone])}><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[13px] font-medium', INK)}>{label}</p>
        <p className="truncate text-[11.5px] text-subtle tabular-nums">{meta}</p>
      </div>
      <span className={cn('text-[13px] font-semibold tabular-nums', INK)}>{value}</span>
      <ChevronRight className="h-4 w-4 text-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function AcctRow({ name, meta, badge, value }: { name: string; meta: string; badge: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[13px] font-medium', INK)}>{name}</p>
        <p className="truncate font-mono text-[10px] text-subtle">{meta}</p>
      </div>
      <span className="rounded-md bg-brand/[0.12] px-1.5 py-0.5 text-[9px] font-bold text-brand-800">{badge}</span>
      <span className={cn('w-28 text-right text-[13px] font-medium tabular-nums', INK)}>{value}</span>
    </div>
  );
}

function HealthRow({ ok, name, status }: { ok: boolean; name: string; status: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 text-[12px]">
      <span className={cn('size-1.5 shrink-0 rounded-full', ok ? 'bg-[color:var(--color-up)]' : 'bg-[#c9992e]')} />
      <span className="flex-1 text-muted-foreground">{name}</span>
      <span className={cn('font-mono text-[10px]', ok ? 'text-[color:var(--color-up)]' : 'text-[#8a6410]')}>{status}</span>
    </div>
  );
}

// Soft brand area chart from the REAL 14-day movement series (net = inflow − outflow).
function FlowChart({ series }: { series: Summary['movementSeries'] }) {
  const W = 300, H = 88, pad = 6;
  const vals = series.map((d) => Number(d.inflow) - Number(d.outflow));
  const hasData = series.length > 1 && vals.some((v) => v !== 0);
  const max = Math.max(1, ...vals.map(Math.abs));
  const pts = (hasData ? vals : series.map(() => 0)).map((v, i) => {
    const x = pad + (i / Math.max(1, series.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v + max) / (2 * max)) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.length ? 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L') : `M${pad},${H / 2} L${W - pad},${H / 2}`;
  const last = pts[pts.length - 1] ?? [W - pad, H / 2];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-28 w-full" aria-hidden>
      {[26, 52, 78].map((y) => <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#1c1b26" strokeOpacity={0.05} />)}
      <path d={`${line} L${last[0].toFixed(1)},${H} L${pad},${H} Z`} fill="url(#ns-flow)" opacity={0.9} />
      <path d={line} pathLength={1} fill="none" stroke="var(--color-brand-700)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={1} style={draw(T.chart)} />
      <circle cx={last[0]} cy={last[1]} r={6} fill="var(--color-brand-700)" opacity={0.14} />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--color-brand-700)" />
      <defs>
        <linearGradient id="ns-flow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-brand)" stopOpacity={0.26} />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
    </svg>
  );
}
