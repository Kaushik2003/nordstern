'use client';

import { useEffect, useState } from 'react';
import { adminGetTenants } from '@/lib/cp';

export default function AdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    adminGetTenants().then(setTenants).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    active:  'text-green-400 bg-green-400/10',
    funding: 'text-yellow-400 bg-yellow-400/10',
    pending: 'text-slate-400 bg-slate-400/10',
    error:   'text-red-400 bg-red-400/10',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-blue-400 text-2xl">⚓</span>
          <h1 className="text-2xl font-bold">Platform Admin</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-slate-400 text-xs mb-1">Total Tenants</div>
            <div className="text-3xl font-bold">{tenants.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-slate-400 text-xs mb-1">Active</div>
            <div className="text-3xl font-bold text-green-400">{tenants.filter(t => t.status === 'active').length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-slate-400 text-xs mb-1">Active Alerts</div>
            <div className="text-3xl font-bold text-red-400">{tenants.reduce((sum, t) => sum + Number(t.active_alerts ?? 0), 0)}</div>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs text-left">
                <th className="px-5 py-3 font-medium">Tenant</th>
                <th className="px-5 py-3 font-medium">Network</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Users</th>
                <th className="px-5 py-3 font-medium">Alerts</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">Loading...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">No tenants yet</td></tr>
              ) : tenants.map(t => (
                <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{t.slug}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${t.network === 'mainnet' ? 'text-orange-400 bg-orange-400/10' : 'text-blue-400 bg-blue-400/10'}`}>
                      {t.network}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColor[t.status] ?? 'text-slate-400 bg-slate-400/10'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-300">{t.user_count}</td>
                  <td className="px-5 py-4">
                    {Number(t.active_alerts) > 0
                      ? <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">{t.active_alerts} active</span>
                      : <span className="text-xs text-slate-500">—</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
