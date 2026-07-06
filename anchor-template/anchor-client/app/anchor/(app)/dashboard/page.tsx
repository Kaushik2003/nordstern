'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAnchor, getAlerts, injectAlert, resolveAlert, getSelectedAnchor, Anchor, Alert } from '@/lib/cp';
import { Card, Badge, StackBadge, Spinner, Button } from '@/components/ui';

export default function DashboardPage() {
  const router = useRouter();
  const [tenant, setTenant]   = useState<Anchor | null>(null);
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [anchorId, setAnchorId] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const id = getSelectedAnchor();
    if (!id) { router.push('/anchor/anchors'); return; }
    setAnchorId(id);
    try {
      const [t, a] = await Promise.all([getAnchor(id), getAlerts(id)]);
      setTenant(t);
      setAlerts(a);
    } catch {
      router.push('/anchor/anchors');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleInjectAlert() {
    await injectAlert(anchorId);
    load();
  }

  async function handleResolve(id: string) {
    await resolveAlert(anchorId, id);
    load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-6 w-6 text-brand" />
      </div>
    );
  }

  if (!tenant) return null;

  const fiat    = Number(tenant.fiat_balance ?? 0);
  const onchain = Number(tenant.onchain_balance ?? 0);
  const mismatch = fiat > 0 ? Math.abs(fiat - onchain) / fiat : 0;
  const outOfSync = alerts.length > 0;
  const asset    = tenant.asset_code ?? 'ANCH';
  const adapters = tenant.adapters;

  return (
    <div className="mx-auto max-w-6xl p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={tenant.network === 'mainnet' ? 'warning' : 'brand'}>
              {tenant.network.toUpperCase()}
            </Badge>
            <StackBadge status={tenant.stack_status} />
          </div>
        </div>
        <button onClick={load} className="text-sm text-muted transition-colors hover:text-ink">↻ Refresh</button>
      </div>

      {/* Reconciliation alert banner */}
      {outOfSync && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-danger/30 bg-danger/10 px-5 py-4">
          <div>
            <div className="font-semibold text-danger">⚠ Out of Sync — ${Number(alerts[0].delta).toFixed(2)} discrepancy detected</div>
            <div className="mt-0.5 text-sm text-muted">
              Fiat: ${Number(alerts[0].fiat_balance).toFixed(2)} · On-chain: {Number(alerts[0].onchain_balance).toFixed(2)} {asset}
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => handleResolve(alerts[0].id)}>
            Mark Resolved
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fiat Balance" value={`$${fiat.toLocaleString()}`} sub="USD reserve" />
        <StatCard label={`On-chain ${asset}`} value={onchain > 0 ? onchain.toLocaleString() : '–'} sub="Distribution account" />
        <StatCard
          label="Reconciliation"
          value={outOfSync ? '⚠ Out of Sync' : '✓ Synced'}
          sub={outOfSync ? `${(mismatch * 100).toFixed(1)}% delta` : 'Fiat = On-chain'}
          valueClass={outOfSync ? 'text-danger' : 'text-success'}
        />
        <StatCard label="Status" value={tenant.stack_status === 'active' ? 'Active' : tenant.stack_status} sub={`Network: ${tenant.network}`} />
      </div>

      {/* Anchor identity & providers */}
      <Card className="mb-8 p-6">
        <h2 className="mb-4 font-semibold">Anchor identity</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-muted">Asset</div>
            <div className="font-mono text-sm text-ink">{asset}</div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-faint">{tenant.asset_issuer ?? '—'}</div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted">SEP-1 domain</div>
            {tenant.home_domain
              ? <a href={`http://${tenant.home_domain}/.well-known/stellar.toml`} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-brand hover:underline">{tenant.home_domain} ↗</a>
              : <span className="text-sm text-muted">—</span>}
          </div>
          <div>
            <div className="mb-1.5 text-xs text-muted">Providers</div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={adapters?.kyc_provider && adapters.kyc_provider !== 'mock' ? 'brand' : 'muted'}>KYC · {adapters?.kyc_provider ?? 'mock'}</Badge>
              <Badge tone="muted">Payout · {adapters?.payout_provider ?? 'mock'}</Badge>
              <Badge tone="muted">Deposit · {adapters?.deposit_provider ?? 'mock'}</Badge>
              <Badge tone="muted">Fee · {adapters?.fee_provider ?? 'mock'}</Badge>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-6 border-t border-line pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <MiniRow label="Legal entity" value={tenant.legal_entity_name} />
          <MiniRow label="Use case" value={tenant.use_case} />
          <MiniRow label="Country" value={tenant.country} />
          <MiniRow label="FIU-IND" value={tenant.fiu_registration_status} />
        </div>
      </Card>

      {/* Balance graph placeholder + transactions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Graph */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 font-semibold">Balance Over Time</h2>
          <MockChart outOfSync={outOfSync} />
        </Card>

        {/* Quick actions */}
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Quick Actions</h2>
          <div className="space-y-3">
            <button onClick={handleInjectAlert} className="block w-full rounded-lg border border-danger/30 px-4 py-3 text-left text-sm text-danger transition-colors hover:bg-danger/10">
              ⚠ Inject reconciliation mismatch
              <div className="mt-0.5 text-xs text-muted">Demo: create a $500 discrepancy</div>
            </button>
            <a href="/anchor/rules" className="block w-full rounded-lg border border-line px-4 py-3 text-sm text-ink transition-colors hover:bg-surface-2">
              ⚙ Configure business rules
            </a>
            <a href={`https://stellar.expert/explorer/testnet/account/${tenant.keypairs?.find(k => k.role === 'distribution')?.public_key}`}
               target="_blank" rel="noopener noreferrer"
               className="block w-full rounded-lg border border-line px-4 py-3 text-sm text-ink transition-colors hover:bg-surface-2">
              ↗ View on Stellar Expert
            </a>
          </div>
        </Card>
      </div>

      {/* Keypairs */}
      {tenant.keypairs && tenant.keypairs.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="mb-4 font-semibold">Your Stellar Accounts</h2>
          <div className="space-y-2">
            {tenant.keypairs.map(kp => (
              <div key={kp.role} className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
                <div>
                  <div className="text-xs capitalize text-muted">{kp.role} Account</div>
                  <div className="mt-0.5 font-mono text-xs text-ink">{kp.public_key}</div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(kp.public_key)} className="text-sm text-muted hover:text-ink">⧉</button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted">{label}</div>
      <div className="text-sm text-ink">{value || <span className="text-faint">Not provided</span>}</div>
    </div>
  );
}

function StatCard({ label, value, sub, valueClass = 'text-ink' }: { label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <Card className="p-5">
      <div className="mb-1 text-xs text-muted">{label}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-faint">{sub}</div>
    </Card>
  );
}

function MockChart({ outOfSync }: { outOfSync: boolean }) {
  // SVG sparkline — mock data showing fiat and on-chain
  const fiats   = [95, 96, 97, 96, 98, 97, 100];
  const anchors = outOfSync ? [95, 96, 97, 96, 98, 97, 105] : [95, 96, 97, 96, 98, 97, 100];

  function toPath(vals: number[], h = 80, w = 400) {
    const min = Math.min(...vals) - 5;
    const max = Math.max(...vals) + 5;
    return vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  }

  return (
    <div className="relative">
      <div className="mb-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-3 bg-brand" /> Fiat</span>
        <span className="flex items-center gap-1.5"><span className={`inline-block h-0.5 w-3 ${outOfSync ? 'bg-danger' : 'bg-success'}`} /> On-chain</span>
      </div>
      <svg viewBox="0 0 400 90" className="w-full" preserveAspectRatio="none">
        <path d={toPath(fiats)} fill="none" stroke="var(--color-brand)" strokeWidth="2" />
        <path d={toPath(anchors)} fill="none" stroke={outOfSync ? 'var(--color-danger)' : 'var(--color-success)'} strokeWidth="2" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}
