'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAnchor, getAlerts, injectAlert, resolveAlert, getSelectedAnchor, Anchor, Alert } from '@/lib/cp';

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
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) return null;

  const fiat    = Number(tenant.fiat_balance ?? 0);
  const onchain = Number(tenant.onchain_balance ?? 0);
  const mismatch = fiat > 0 ? Math.abs(fiat - onchain) / fiat : 0;
  const outOfSync = alerts.length > 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${tenant.network === 'mainnet' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {tenant.network.toUpperCase()}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${tenant.stack_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {tenant.stack_status === 'active' ? '✓ Operational' : tenant.stack_status}
            </span>
          </div>
        </div>
        <button onClick={load} className="text-slate-400 hover:text-white text-sm transition-colors">↻ Refresh</button>
      </div>

      {/* Reconciliation alert banner */}
      {outOfSync && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <div className="text-red-400 font-semibold">⚠ Out of Sync — ${Number(alerts[0].delta).toFixed(2)} discrepancy detected</div>
            <div className="text-slate-400 text-sm mt-0.5">
              Fiat: ${Number(alerts[0].fiat_balance).toFixed(2)} · On-chain: {Number(alerts[0].onchain_balance).toFixed(2)} ANCH
            </div>
          </div>
          <button onClick={() => handleResolve(alerts[0].id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm px-4 py-2 rounded-lg transition-colors">
            Mark Resolved
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Fiat Balance" value={`$${fiat.toLocaleString()}`} sub="USD reserve" />
        <StatCard label="On-chain ANCH" value={onchain > 0 ? onchain.toLocaleString() : '–'} sub="Distribution account" />
        <StatCard
          label="Reconciliation"
          value={outOfSync ? '⚠ Out of Sync' : '✓ Synced'}
          sub={outOfSync ? `${(mismatch * 100).toFixed(1)}% delta` : 'Fiat = On-chain'}
          valueClass={outOfSync ? 'text-red-400' : 'text-green-400'}
        />
        <StatCard label="Status" value={tenant.stack_status === 'active' ? 'Active' : tenant.stack_status} sub={`Network: ${tenant.network}`} />
      </div>

      {/* Balance graph placeholder + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Balance Over Time</h2>
          <MockChart outOfSync={outOfSync} />
        </div>

        {/* Quick actions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button onClick={handleInjectAlert} className="w-full border border-red-500/30 hover:bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-lg transition-colors text-left">
              ⚠ Inject reconciliation mismatch
              <div className="text-xs text-slate-500 mt-0.5">Demo: create a $500 discrepancy</div>
            </button>
            <a href="/anchor/rules" className="w-full border border-slate-700 hover:border-slate-600 text-slate-300 text-sm px-4 py-3 rounded-lg transition-colors block">
              ⚙ Configure business rules
            </a>
            <a href={`https://stellar.expert/explorer/testnet/account/${tenant.keypairs?.find(k => k.role === 'distribution')?.public_key}`}
               target="_blank" rel="noopener noreferrer"
               className="w-full border border-slate-700 hover:border-slate-600 text-slate-300 text-sm px-4 py-3 rounded-lg transition-colors block">
              ↗ View on Stellar Expert
            </a>
          </div>
        </div>
      </div>

      {/* Keypairs */}
      {tenant.keypairs && tenant.keypairs.length > 0 && (
        <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Your Stellar Accounts</h2>
          <div className="space-y-2">
            {tenant.keypairs.map(kp => (
              <div key={kp.role} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                <div>
                  <div className="text-xs text-slate-400 capitalize">{kp.role} Account</div>
                  <div className="font-mono text-xs text-slate-300 mt-0.5">{kp.public_key}</div>
                </div>
                <button onClick={() => navigator.clipboard.writeText(kp.public_key)} className="text-slate-500 hover:text-white text-sm">⧉</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, valueClass = 'text-white' }: { label: string; value: string; sub: string; valueClass?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <div className="text-slate-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${valueClass}`}>{value}</div>
      <div className="text-slate-500 text-xs mt-1">{sub}</div>
    </div>
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
      <div className="flex gap-4 text-xs text-slate-400 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 inline-block" /> Fiat</span>
        <span className="flex items-center gap-1.5"><span className={`w-3 h-0.5 ${outOfSync ? 'bg-red-400' : 'bg-green-400'} inline-block`} /> On-chain</span>
      </div>
      <svg viewBox="0 0 400 90" className="w-full" preserveAspectRatio="none">
        <path d={toPath(fiats)} fill="none" stroke="#60a5fa" strokeWidth="2" />
        <path d={toPath(anchors)} fill="none" stroke={outOfSync ? '#f87171' : '#4ade80'} strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-xs text-slate-600 mt-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}
