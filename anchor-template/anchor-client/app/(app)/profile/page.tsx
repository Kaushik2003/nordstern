'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Trash2, LogOut, Check, X, Pencil, ShieldCheck, Link2, ArrowRight, ChevronDown, CheckCircle2, Clock } from 'lucide-react';
import { customer as api, ApiError, type Wallet as W } from '@/lib/customer';
import { connect } from '@/lib/wallet';
import { ensureWalletLinked } from '@/lib/link-wallet';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { Panel, Button, Input, Spinner, Badge, reveal } from '@/components/ui';
import { Avatar, AvatarPicker, avatarEmoji } from '@/components/avatar';
import { DiditMark, NordSternMark } from '@/components/ecosystem';

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

  const kyc = customer?.kycStatus ?? 'unverified';

  return (
    <div className="space-y-5">
      <h1 style={reveal(0.02)} className="text-[19px] font-semibold tracking-tight text-ink">Profile</h1>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        {/* ---- Left column ---- */}
        <div className="space-y-5">
          {/* Account hero — light-purple gradient header */}
          <div style={reveal(0.06)} className="overflow-hidden rounded-mock border border-brand-100 bg-gradient-to-br from-brand-50 to-brand-100 p-6 sm:p-7">
            <div className="flex items-center gap-4">
              <button onClick={() => setPickingAvatar((v) => !v)} className="group relative" aria-label="Change avatar">
                {customer && <Avatar customer={customer} size="lg" className="shadow-sm ring-1 ring-black/[0.04]" />}
                <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border border-line bg-canvas text-muted shadow-sm transition-colors group-hover:text-ink">
                  <Pencil className="size-3" />
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-xl font-semibold text-ink">{customer?.fullName || 'Your account'}</p>
                <p className="truncate text-sm text-muted">{customer?.email}</p>
              </div>
            </div>

            {pickingAvatar && customer && (
              <div className="mt-4 rounded-xl border border-white/60 bg-white/70 p-3">
                <p className="mb-2 text-xs text-muted">Pick your avatar</p>
                <AvatarPicker value={avatarEmoji(customer)} onPick={pickAvatar} />
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-[11.5px] font-medium text-brand-800/70">Full name</p>
                {editingName ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-11 border-white/60 bg-white/80" />
                    <Button size="sm" onClick={saveName}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-4 py-3">
                    <span className="text-[15px] font-medium text-ink">{customer?.fullName || 'Add your name'}</span>
                    <button onClick={() => setEditingName(true)} className="text-muted transition-colors hover:text-ink" aria-label="Edit name"><Pencil className="size-4" /></button>
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11.5px] font-medium text-brand-800/70">Country</p>
                <div className="relative mt-1">
                  <select
                    value={country}
                    onChange={(e) => saveCountry(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/60 bg-white/70 px-4 py-3 text-[15px] font-medium text-ink outline-none transition-colors duration-200 focus:border-brand-300 focus:bg-white"
                  >
                    <option value="">Select your country</option>
                    {country && !COUNTRIES.includes(country) && <option value={country}>{country}</option>}
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-subtle" />
                </div>
              </div>
            </div>
          </div>

          {/* Identity verification — status-aware */}
          <IdentityCard status={kyc} onAction={() => router.push('/verify')} />
        </div>

        {/* ---- Right column ---- */}
        <div className="space-y-5">
          {/* Infrastructure */}
          <Panel style={reveal(0.14)} className="p-0">
            <div className="border-b border-black/[0.05] px-6 py-5">
              <p className="text-[15px] font-semibold text-ink">Infrastructure</p>
              <p className="text-[12px] text-subtle">How this service is built, for your transparency.</p>
            </div>
            <div className="divide-y divide-black/[0.05]">
              <InfraRow label="Service" sub="The app you’re using"><span className="text-ink">{brand.name}</span></InfraRow>
              <InfraRow label="Provisioned by" sub="Financial infrastructure"><NordSternMark className="text-[13.5px]" /></InfraRow>
              <InfraRow label="Identity provider" sub="Verifies you once, reused across services"><DiditMark className="text-[13.5px]" /></InfraRow>
              <InfraRow label="Environment" sub="Current network"><Badge tone={brand.network === 'mainnet' ? 'success' : 'info'}>{brand.network === 'mainnet' ? 'Mainnet' : 'Testnet'}</Badge></InfraRow>
            </div>
          </Panel>

          {/* Linked wallets — proven ownership only */}
          <div style={reveal(0.18)} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Wallet className="size-[18px] text-brand-700" />
              <h2 className="text-lg font-semibold text-ink">Linked wallets</h2>
            </div>
            <Panel className="p-5">
              <p className="text-sm leading-relaxed text-muted">
                Your account is your email. Link a wallet by proving you control it — you&apos;ll be asked to
                sign a quick verification request. Only wallets you can sign with can be linked.
              </p>
              {wallets === null ? <Skeletons /> : wallets.length === 0 ? (
                <p className="mt-5 text-sm text-subtle">No wallets linked yet.</p>
              ) : (
                <div className="mt-5 space-y-2">
                  {wallets.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-xl border border-black/[0.06] px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-ink">{w.label || 'Wallet'}</p>
                        <p className="font-mono text-xs text-subtle">{mask(w.address)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="success"><ShieldCheck className="mr-1 inline h-3 w-3" />Verified</Badge>
                        <button onClick={() => removeWallet(w.id)} className="text-muted transition-colors hover:text-[var(--color-danger)]"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-black/[0.05] pt-5">
                <button onClick={linkWallet} disabled={linking}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-60">
                  {linking ? <><Spinner className="h-4 w-4" /> Waiting for signature…</> : <><Link2 className="size-4" /> Connect &amp; verify a wallet</>}
                </button>
                {err && <p className="mt-2 text-sm text-[var(--color-danger)]">{err}</p>}
              </div>
            </Panel>
          </div>

          {/* Sign out */}
          <Panel style={reveal(0.22)} className="p-2">
            <button onClick={doSignOut}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-[var(--color-down)]">
              <LogOut className="size-4" /> Sign out
            </button>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// Status-aware identity card matching the nord-v2 amber treatment for the unverified state,
// with success / warning / danger variants for the other KYC statuses.
function IdentityCard({ status, onAction }: { status: string; onAction: () => void }) {
  const approved = status === 'approved';
  const pending = status === 'pending';
  const declined = status === 'declined';

  const shell = approved
    ? 'rounded-mock border border-black/[0.05] bg-canvas'
    : declined
      ? 'rounded-mock border border-[var(--color-danger)]/25 bg-canvas'
      : 'rounded-mock border border-[#f0e6c8] bg-[#fdfaf0]';

  return (
    <div style={reveal(0.1)} className={`${shell} p-6 sm:p-7`}>
      <div className="flex gap-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl shadow-sm ${approved ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-white text-brand-700'}`}>
          {approved ? <CheckCircle2 className="size-5" /> : pending ? <Clock className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold text-ink">{approved ? 'Verified for the NordStern Network' : 'Identity Verification'}</h2>
            {approved
              ? <span className="rounded-full bg-[var(--color-success-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-success)]">✓ Verified</span>
              : <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${declined ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : 'bg-[#fef3c7] text-[#b45309]'}`}>{pending ? 'In review' : declined ? 'Action needed' : 'Required'}</span>}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {approved
              ? 'You can buy and sell here, and across other participating services provisioned through NordStern, without verifying again.'
              : pending
                ? 'Handled securely by DIDIT. We’ll let you know the moment your verification clears.'
                : 'Handled securely by DIDIT. A one-time check that lets you buy and sell here and across participating NordStern-powered services.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-subtle">
            <span>Identity by</span><DiditMark className="text-xs" />
            <span className="px-1">·</span>
            <span>Network by</span><NordSternMark className="text-xs" />
          </div>
          {!approved && (
            <button onClick={onAction} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-ink/90 active:scale-[0.98]">
              {declined ? 'Try again' : pending ? 'Check status' : 'Start verification'} <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfraRow({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">{label}</p>
        <p className="text-[11.5px] text-subtle">{sub}</p>
      </div>
      <div className="ml-auto text-[13.5px] font-medium">{children}</div>
    </div>
  );
}

function Skeletons() { return <div className="mt-5 space-y-2"><div className="h-12 animate-pulse rounded-xl bg-surface-2" /><div className="h-12 animate-pulse rounded-xl bg-surface-2" /></div>; }
