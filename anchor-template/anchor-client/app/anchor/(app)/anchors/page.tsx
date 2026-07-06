'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listAnchors, createAnchor, teardownAnchor, setSelectedAnchor, isLoggedIn, Anchor,
} from '@/lib/cp';
import { Button, Card, StackBadge } from '@/components/ui';

export default function AnchorsPage() {
  const router = useRouter();
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration Wizard State
  const [step, setStep]       = useState(1);
  const [name, setName]       = useState('');
  const [kyc, setKyc]         = useState('mock');
  const [business, setBusiness] = useState({
    legal_entity_name: '',
    company_type: '',
    country: '',
    fiu_registration_status: '',
    support_email: ''
  });

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
      const payload = {
        name,
        adapters: { kyc },
        ...business
      };
      const anchor = await createAnchor(payload);
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
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-1 text-2xl font-bold">Your anchors</h1>
      <p className="mb-8 text-sm text-muted">Each anchor runs as its own isolated stack (Anchor Platform + business server + subdomain).</p>

      {/* Create Wizard */}
      <Card className="mb-8 p-6">
        <h2 className="mb-1 font-semibold">Register your Business & Anchor</h2>
        <p className="mb-5 text-sm text-muted">Step {step} of 2 (Quick Sandbox Setup)</p>
        {error && <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
        
        <form onSubmit={step === 2 ? handleCreate : (e) => { e.preventDefault(); setStep(s => s + 1); }} className="space-y-4">
          
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-muted">Legal Entity Name</label>
                <input value={business.legal_entity_name} onChange={e => setBusiness({...business, legal_entity_name: e.target.value})} placeholder="ACME Corp Pvt Ltd" required
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder-faint outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted">Company Type</label>
                <select value={business.company_type} onChange={e => setBusiness({...business, company_type: e.target.value})} required
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15">
                  <option value="">Select type...</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Exchange">Exchange</option>
                  <option value="Bank">Bank</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted">Country of Operation</label>
                <input value={business.country} onChange={e => setBusiness({...business, country: e.target.value})} placeholder="India" required
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder-faint outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted">Support Email</label>
                <input type="email" value={business.support_email} onChange={e => setBusiness({...business, support_email: e.target.value})} placeholder="support@acme.com" required
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder-faint outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm text-muted">Primary Use Case</label>
                <select value={(business as any).use_case || ''} onChange={e => setBusiness({...business, use_case: e.target.value} as any)} required
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15">
                  <option value="">Select use case...</option>
                  <option value="Cross-border Remittance">Cross-border Remittance</option>
                  <option value="Crypto Exchange / On-ramp">Crypto Exchange / On-ramp</option>
                  <option value="B2B Payments">B2B Payments</option>
                  <option value="Wallet">Wallet Integration</option>
                  <option value="Other">Other</option>
                </select>
                <p className="mt-2 text-xs text-muted">We use this to tailor your dashboard experience.</p>
              </div>
              <div className="min-w-56 flex-1">
                <label className="mb-1.5 block text-sm text-muted">Anchor Brand Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="ACME Remittance" required
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder-faint outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted">KYC provider</label>
                <select value={kyc} onChange={e => setKyc(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand/50 focus:ring-2 focus:ring-brand/15">
                  <option value="mock">Mock (auto-accept)</option>
                  <option value="surepass">surepass (sandbox)</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>← Back</Button>
            ) : <div />}
            <Button type="submit" disabled={creating}>
              {step === 2 ? (creating ? 'Creating & Provisioning…' : 'Create Sandbox Anchor →') : 'Continue →'}
            </Button>
          </div>
        </form>
      </Card>

      {/* List */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-5 py-3 font-medium">Anchor</th>
              <th className="px-5 py-3 font-medium">Asset</th>
              <th className="px-5 py-3 font-medium">Domain</th>
              <th className="px-5 py-3 font-medium">KYC</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">Loading…</td></tr>
            ) : anchors.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted">No anchors yet — create one above.</td></tr>
            ) : anchors.map(a => (
              <tr key={a.id} className="border-b border-line/50 transition-colors hover:bg-surface-2/50">
                <td className="px-5 py-4">
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="font-mono text-xs text-muted">{a.slug}</div>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-ink">{a.asset_code ?? '—'}</td>
                <td className="px-5 py-4 text-xs">
                  {a.stack_status === 'active' && a.home_domain
                    ? <a href={`http://${a.home_domain}/.well-known/stellar.toml`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{a.home_domain} ↗</a>
                    : <span className="text-muted">{a.home_domain ?? '—'}</span>}
                </td>
                <td className="px-5 py-4 text-xs text-muted">{a.kyc_provider ?? 'mock'}</td>
                <td className="px-5 py-4">
                  <StackBadge status={a.stack_status} />
                  {a.stack_status === 'provisioning' && a.status_detail && (
                    <div className="mt-1.5 text-[10px] text-muted">{a.status_detail}</div>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    {(a.stack_status === 'pending' || a.stack_status === 'error') && (
                      <Button size="sm" onClick={() => router.push(`/anchor/onboarding?anchor=${a.id}`)}>Provision</Button>
                    )}
                    {a.stack_status === 'provisioning' && (
                      <Button size="sm" variant="outline" onClick={() => router.push(`/anchor/onboarding?anchor=${a.id}`)}>View</Button>
                    )}
                    {a.stack_status === 'active' && (
                      <Button size="sm" onClick={() => open(a)}>Open</Button>
                    )}
                    {a.stack_status !== 'removed' && (
                      <Button size="sm" variant="danger" onClick={() => handleTeardown(a)}>Tear down</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
