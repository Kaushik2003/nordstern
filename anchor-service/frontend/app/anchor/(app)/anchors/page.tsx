'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listAnchors, createAnchor, teardownAnchor, setSelectedAnchor, isLoggedIn, Anchor,
} from '@/lib/cp';

const STATUS_COLOR: Record<string, string> = {
  active:       'text-green-400 bg-green-400/10',
  provisioning: 'text-yellow-400 bg-yellow-400/10',
  pending:      'text-slate-400 bg-slate-400/10',
  error:        'text-red-400 bg-red-400/10',
  suspended:    'text-orange-400 bg-orange-400/10',
  removed:      'text-slate-500 bg-slate-500/10',
};

export default function AnchorsPage() {
  const router = useRouter();
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName]       = useState('');
  const [kyc, setKyc]         = useState('mock');
  const [creating, setCreating] = useState(false);
  const [error, setError]     = useState('');

  async function load() {
    try {
      setAnchors(await listAnchors());
    } catch {
      router.push('/anchor/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/anchor/login'); return; }
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const anchor = await createAnchor(name, { kyc });
      // Jump straight into provisioning for the new anchor.
      router.push(`/anchor/onboarding?anchor=${anchor.id}`);
    } catch (err: any) {
      setError(err.message);
      setCreating(false);
    }
  }

  function open(a: Anchor) {
    setSelectedAnchor(a.id);
    router.push('/anchor/dashboard');
  }

  async function handleTeardown(a: Anchor) {
    if (!confirm(`Tear down "${a.name}"? This removes its containers and database.`)) return;
    await teardownAnchor(a.id);
    load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-1">Your anchors</h1>
      <p className="text-slate-400 text-sm mb-6">Each anchor runs as its own isolated stack (Anchor Platform + business server + subdomain).</p>

      {/* Create */}
      <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
        <h2 className="font-semibold mb-4">Create a new anchor</h2>
        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-sm text-slate-400 block mb-1">Anchor name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="ACME Remittance" required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">KYC provider</label>
            <select value={kyc} onChange={e => setKyc(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="mock">Mock (auto-accept)</option>
              <option value="surepass">surepass (sandbox)</option>
            </select>
          </div>
          <button disabled={creating} type="submit" className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
            {creating ? 'Creating…' : 'Create & provision →'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs text-left">
              <th className="px-5 py-3 font-medium">Anchor</th>
              <th className="px-5 py-3 font-medium">Asset</th>
              <th className="px-5 py-3 font-medium">Domain</th>
              <th className="px-5 py-3 font-medium">KYC</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">Loading…</td></tr>
            ) : anchors.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">No anchors yet — create one above.</td></tr>
            ) : anchors.map(a => (
              <tr key={a.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{a.slug}</div>
                </td>
                <td className="px-5 py-4 text-sm font-mono text-slate-300">{a.asset_code ?? '—'}</td>
                <td className="px-5 py-4 text-xs">
                  {a.stack_status === 'active' && a.home_domain
                    ? <a href={`http://${a.home_domain}/.well-known/stellar.toml`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{a.home_domain} ↗</a>
                    : <span className="text-slate-500">{a.home_domain ?? '—'}</span>}
                </td>
                <td className="px-5 py-4 text-xs text-slate-400">{a.kyc_provider ?? 'mock'}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[a.stack_status] ?? 'text-slate-400 bg-slate-400/10'}`}>
                    {a.stack_status}
                  </span>
                  {a.stack_status === 'provisioning' && a.status_detail && (
                    <div className="text-[10px] text-slate-500 mt-1">{a.status_detail}</div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2 justify-end">
                    {(a.stack_status === 'pending' || a.stack_status === 'error') && (
                      <button onClick={() => router.push(`/anchor/onboarding?anchor=${a.id}`)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors">Provision</button>
                    )}
                    {a.stack_status === 'provisioning' && (
                      <button onClick={() => router.push(`/anchor/onboarding?anchor=${a.id}`)} className="text-xs border border-slate-700 hover:border-slate-600 text-slate-300 px-3 py-1.5 rounded-lg transition-colors">View</button>
                    )}
                    {a.stack_status === 'active' && (
                      <button onClick={() => open(a)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors">Open</button>
                    )}
                    {a.stack_status !== 'removed' && (
                      <button onClick={() => handleTeardown(a)} className="text-xs border border-red-500/30 hover:bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg transition-colors">Tear down</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
