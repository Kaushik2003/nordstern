'use client';

import { useEffect, useState } from 'react';
import { adminGetAnchors } from '@/lib/cp';
import { Card, StackBadge, Badge } from '@/components/ui';

export default function AdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    adminGetAnchors().then(setTenants).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-canvas p-8 text-ink">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="text-2xl text-brand">⚓</span>
          <h1 className="text-2xl font-bold">Platform Admin</h1>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <Card className="p-5">
            <div className="mb-1 text-xs text-muted">Total Anchors</div>
            <div className="text-3xl font-bold">{tenants.length}</div>
          </Card>
          <Card className="p-5">
            <div className="mb-1 text-xs text-muted">Active</div>
            <div className="text-3xl font-bold text-success">{tenants.filter(t => t.stack_status === 'active').length}</div>
          </Card>
          <Card className="p-5">
            <div className="mb-1 text-xs text-muted">Active Alerts</div>
            <div className="text-3xl font-bold text-danger">{tenants.reduce((sum, t) => sum + Number(t.active_alerts ?? 0), 0)}</div>
          </Card>
        </div>

        {error && <div className="mb-4 text-sm text-danger">{error}</div>}

        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Anchor</th>
                <th className="px-5 py-3 font-medium">Network</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Owner</th>
                <th className="px-5 py-3 font-medium">Alerts</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">Loading...</td></tr>
              ) : tenants.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">No tenants yet</td></tr>
              ) : tenants.map(t => (
                <tr key={t.id} className="border-b border-line/50 transition-colors hover:bg-surface-2/50">
                  <td className="px-5 py-4">
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="font-mono text-xs text-muted">{t.slug}</div>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={t.network === 'mainnet' ? 'warning' : 'brand'}>{t.network}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <StackBadge status={t.stack_status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">{t.owner_email ?? '—'}</td>
                  <td className="px-5 py-4">
                    {Number(t.active_alerts) > 0
                      ? <Badge tone="danger">{t.active_alerts} active</Badge>
                      : <span className="text-xs text-faint">—</span>
                    }
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
