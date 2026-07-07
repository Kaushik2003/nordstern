'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Plus, Trash2, ShieldCheck, LogOut, Check, X, Pencil } from 'lucide-react';
import { customer as api, ApiError, type Wallet as W } from '@/lib/customer';
import { useCustomer } from '@/components/customer-context';
import { Card, CardBody, Badge, Button, Input, Spinner, type Tone } from '@/components/ui';

const kycTone = (s: string): Tone => (s === 'approved' ? 'success' : s === 'declined' ? 'danger' : 'warning');
const kycLabel = (s: string) => (s === 'approved' ? 'Verified' : s === 'pending' ? 'In review' : s === 'declined' ? 'Failed' : 'Not verified');
const mask = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function ProfilePage() {
  const { customer, refresh, signOut } = useCustomer();
  const router = useRouter();

  const [wallets, setWallets] = useState<W[] | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(customer?.fullName ?? '');
  const [addr, setAddr] = useState('');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.wallets().then(setWallets).catch(() => setWallets([])); }, []);
  useEffect(() => { setName(customer?.fullName ?? ''); }, [customer?.fullName]);

  async function saveName() {
    await api.updateProfile({ fullName: name.trim() }).catch(() => {});
    await refresh(); setEditingName(false);
  }
  async function addWallet() {
    setAdding(true); setErr('');
    try {
      await api.addWallet(addr.trim(), label.trim() || undefined);
      setWallets(await api.wallets()); setAddr(''); setLabel('');
    } catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not link wallet'); }
    finally { setAdding(false); }
  }
  async function removeWallet(id: string) {
    if (!confirm('Unlink this wallet?')) return;
    await api.removeWallet(id).catch(() => {});
    setWallets(await api.wallets());
  }
  async function doSignOut() { await signOut(); router.replace('/login'); }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-ink">Profile</h1>

      {/* Personal */}
      <Card><CardBody className="space-y-4">
        <Field label="Email" value={customer?.email ?? '—'} />
        <div>
          <p className="text-xs text-muted">Full name</p>
          {editingName ? (
            <div className="mt-1 flex items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-10" />
              <Button size="sm" onClick={saveName}><Check className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="mt-0.5 flex items-center justify-between">
              <p className="font-medium text-ink">{customer?.fullName || 'Add your name'}</p>
              <button onClick={() => setEditingName(true)} className="text-muted hover:text-ink"><Pencil className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      </CardBody></Card>

      {/* Identity / KYC */}
      <Card><CardBody className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ShieldCheck className="h-5 w-5 text-brand-deep" /></div>
        <div className="flex-1"><p className="font-medium text-ink">Identity verification</p><p className="text-xs text-muted">Powered by DIDIT — completed once, reused everywhere.</p></div>
        <Badge tone={kycTone(customer?.kycStatus ?? 'unverified')}>{kycLabel(customer?.kycStatus ?? 'unverified')}</Badge>
      </CardBody></Card>

      {/* Linked wallets */}
      <div>
        <div className="mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-muted" /><h2 className="font-semibold text-ink">Linked wallets</h2></div>
        <Card><CardBody className="space-y-3">
          <p className="text-xs text-muted">Wallets are optional and can be added or removed anytime. Your account is your email — wallets just link to it.</p>
          {wallets === null ? <Skeletons /> : wallets.length === 0 ? (
            <p className="py-2 text-sm text-faint">No wallets linked yet.</p>
          ) : (
            <div className="space-y-2">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                  <div><p className="text-sm font-medium text-ink">{w.label || 'Wallet'}</p><p className="font-mono text-xs text-faint">{mask(w.address)}</p></div>
                  <button onClick={() => removeWallet(w.id)} className="text-muted hover:text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 border-t border-line pt-3">
            <Input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Wallet address" className="h-10 font-mono text-sm" />
            <div className="flex gap-2">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="h-10" />
              <Button size="sm" onClick={addWallet} disabled={adding || !addr}>{adding ? <Spinner className="h-4 w-4" /> : <><Plus className="h-4 w-4" /> Link</>}</Button>
            </div>
            {err && <p className="text-sm text-[var(--color-danger)]">{err}</p>}
          </div>
        </CardBody></Card>
      </div>

      <Button variant="outline" size="block" onClick={doSignOut}><LogOut className="h-4 w-4" /> Sign out</Button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted">{label}</p><p className="mt-0.5 font-medium text-ink">{value}</p></div>;
}
function Skeletons() { return <div className="space-y-2"><div className="h-12 animate-pulse rounded-xl bg-surface-2" /><div className="h-12 animate-pulse rounded-xl bg-surface-2" /></div>; }
