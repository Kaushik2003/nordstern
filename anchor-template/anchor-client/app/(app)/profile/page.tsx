'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Trash2, LogOut, Check, X, Pencil, ShieldCheck, Link2 } from 'lucide-react';
import { customer as api, ApiError, type Wallet as W } from '@/lib/customer';
import { connect } from '@/lib/wallet';
import { ensureWalletLinked } from '@/lib/link-wallet';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Button, Input, Spinner, Badge } from '@/components/ui';
import { Avatar, AvatarPicker, avatarEmoji } from '@/components/avatar';
import { VerificationCard, InfrastructureSection } from '@/components/ecosystem';

const mask = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// A compact, common-country list for the picker; the KYC-filled value is always included even
// if it's not here. Not exhaustive — enough to cover the pilot's users without a huge bundle.
const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Singapore', 'United Arab Emirates',
  'Germany', 'France', 'Netherlands', 'Nigeria', 'Kenya', 'South Africa', 'Brazil', 'Mexico',
  'Japan', 'Philippines', 'Indonesia', 'Bangladesh', 'Pakistan', 'Sri Lanka', 'Nepal',
];

export default function ProfilePage() {
  const { customer, refresh, signOut } = useCustomer();
  const brand = useBrand();
  const router = useRouter();

  const [wallets, setWallets] = useState<W[] | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(customer?.fullName ?? '');
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState('');

  const country = (customer?.preferences?.country as string | undefined) ?? '';

  useEffect(() => { api.wallets().then(setWallets).catch(() => setWallets([])); }, []);
  useEffect(() => { setName(customer?.fullName ?? ''); }, [customer?.fullName]);

  async function saveName() {
    await api.updateProfile({ fullName: name.trim() }).catch(() => {});
    await refresh(); setEditingName(false);
  }
  async function pickAvatar(emoji: string) {
    setPickingAvatar(false);
    await api.updateProfile({ preferences: { avatar: emoji } }).catch(() => {});
    await refresh();
  }
  async function saveCountry(value: string) {
    await api.updateProfile({ preferences: { country: value } }).catch(() => {});
    await refresh();
  }

  // Prove-then-link: connect a wallet, sign a server-issued challenge, verify. This is the
  // only way to attach a wallet — you can link only a wallet you can actually sign with.
  async function linkWallet() {
    setLinking(true); setErr('');
    try {
      const address = await connect();
      await ensureWalletLinked(address);
      setWallets(await api.wallets());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message
        : e instanceof Error && /cancel|denied|reject/i.test(e.message) ? 'Verification cancelled'
        : 'Could not verify wallet ownership';
      setErr(msg);
    } finally { setLinking(false); }
  }
  async function removeWallet(id: string) {
    if (!confirm('Unlink this wallet?')) return;
    await api.removeWallet(id).catch(() => {});
    setWallets(await api.wallets());
  }
  async function doSignOut() { await signOut(); router.replace('/login'); }

  return (
    <div className="mx-auto max-w-3xl space-y-6 fade-up">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Profile</h1>

      {/* Personal */}
      <Card><CardBody className="space-y-4">
        {/* Avatar + identity header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setPickingAvatar((v) => !v)} className="group relative" aria-label="Change avatar">
            {customer && <Avatar customer={customer} size="xl" />}
            <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-canvas text-muted shadow-sm transition group-hover:text-ink">
              <Pencil className="h-3 w-3" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-ink">{customer?.fullName || 'Your account'}</p>
            <p className="truncate text-sm text-muted">{customer?.email}</p>
          </div>
        </div>

        {pickingAvatar && customer && (
          <div className="rounded-xl border border-line bg-surface/50 p-3">
            <p className="mb-2 text-xs text-muted">Pick your avatar</p>
            <AvatarPicker value={avatarEmoji(customer)} onPick={pickAvatar} />
          </div>
        )}

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

        <div>
          <p className="text-xs text-muted">Country</p>
          <select
            value={COUNTRIES.includes(country) || country === '' ? country : country}
            onChange={(e) => saveCountry(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Select your country</option>
            {country && !COUNTRIES.includes(country) && <option value={country}>{country}</option>}
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </CardBody></Card>

      {/* Identity / KYC — informative, network-aware */}
      <VerificationCard status={customer?.kycStatus ?? 'unverified'} onAction={() => router.push('/verify')} />

      {/* Infrastructure — transparency about how this service is built */}
      <InfrastructureSection anchorName={brand.name} />

      {/* Linked wallets — proven ownership only */}
      <div>
        <div className="mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-muted" /><h2 className="font-semibold text-ink">Linked wallets</h2></div>
        <Card><CardBody className="space-y-3">
          <p className="text-xs text-muted">
            Your account is your email. Link a wallet by proving you control it — you&apos;ll be asked to
            sign a quick verification request. Only wallets you can sign with can be linked.
          </p>
          {wallets === null ? <Skeletons /> : wallets.length === 0 ? (
            <p className="py-2 text-sm text-faint">No wallets linked yet.</p>
          ) : (
            <div className="space-y-2">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-ink">{w.label || 'Wallet'}</p>
                    <p className="font-mono text-xs text-faint">{mask(w.address)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="success"><ShieldCheck className="mr-1 inline h-3 w-3" />Verified</Badge>
                    <button onClick={() => removeWallet(w.id)} className="text-muted hover:text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 border-t border-line pt-3">
            <Button size="block" variant="outline" onClick={linkWallet} disabled={linking}>
              {linking ? <><Spinner className="h-4 w-4" /> Waiting for signature…</> : <><Link2 className="h-4 w-4" /> Connect &amp; verify a wallet</>}
            </Button>
            {err && <p className="text-sm text-[var(--color-danger)]">{err}</p>}
          </div>
        </CardBody></Card>
      </div>

      <Button variant="outline" size="block" onClick={doSignOut}><LogOut className="h-4 w-4" /> Sign out</Button>
    </div>
  );
}

function Skeletons() { return <div className="space-y-2"><div className="h-12 animate-pulse rounded-xl bg-surface-2" /><div className="h-12 animate-pulse rounded-xl bg-surface-2" /></div>; }
