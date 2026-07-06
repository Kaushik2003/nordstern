'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAnchor, getSelectedAnchor, Anchor } from '@/lib/cp';
import { Card, StackBadge } from '@/components/ui';

export default function SettingsPage() {
  const router = useRouter();
  const [tenant, setTenant]   = useState<Anchor | null>(null);
  const [copied, setCopied]   = useState('');

  useEffect(() => {
    const id = getSelectedAnchor();
    if (!id) { router.push('/anchor/anchors'); return; }
    getAnchor(id).then(setTenant);
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const distKey = tenant?.keypairs?.find(k => k.role === 'distribution');
  const issuerKey = tenant?.keypairs?.find(k => k.role === 'issuer');

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="space-y-6">
        {/* Anchor Info */}
        <Card className="space-y-4 p-6">
          <h2 className="font-semibold">Anchor Info</h2>
          <Row label="Anchor name" value={tenant?.name ?? '…'} />
          <Row label="Asset" value={tenant?.asset_code ?? '…'} />
          <Row label="Network" value={tenant?.network ?? '…'} />
          <div>
            <div className="mb-0.5 text-xs text-muted">Status</div>
            <div className="mt-1"><StackBadge status={tenant?.stack_status ?? 'pending'} /></div>
          </div>
          <div>
            <div className="mb-1 text-xs text-muted">Stellar.toml</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-brand">http://{tenant?.home_domain}/.well-known/stellar.toml</span>
              <button onClick={() => copy(`http://${tenant?.home_domain}/.well-known/stellar.toml`, 'toml')} className="text-xs text-muted hover:text-ink">
                {copied === 'toml' ? '✓' : '⧉'}
              </button>
            </div>
          </div>
        </Card>

        {/* Stellar Accounts */}
        {tenant?.keypairs && (
          <Card className="space-y-3 p-6">
            <h2 className="font-semibold">Stellar Accounts (Testnet)</h2>
            {tenant.keypairs.map(kp => (
              <div key={kp.role} className="rounded-lg bg-surface-2 px-4 py-3">
                <div className="mb-1 text-xs capitalize text-muted">{kp.role}</div>
                <div className="flex items-center justify-between">
                  <span className="truncate font-mono text-xs text-ink">{kp.public_key}</span>
                  <button onClick={() => copy(kp.public_key, kp.role)} className="ml-3 shrink-0 text-xs text-muted hover:text-ink">
                    {copied === kp.role ? '✓ Copied' : '⧉'}
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Providers (adapters) */}
        <Card className="space-y-3 p-6">
          <h2 className="font-semibold">Providers</h2>
          <p className="text-sm text-muted">Swappable adapters for this anchor — mock is the default; real vendors plug in behind each seam.</p>
          <div className="grid grid-cols-2 gap-3">
            <ProviderRow label="KYC" value={tenant?.adapters?.kyc_provider} />
            <ProviderRow label="Payout" value={tenant?.adapters?.payout_provider} />
            <ProviderRow label="Deposit (fiat-in)" value={tenant?.adapters?.deposit_provider} />
            <ProviderRow label="Fee" value={tenant?.adapters?.fee_provider} />
          </div>
        </Card>

        {/* Go Live / Compliance */}
        <Card className="space-y-4 p-6 border-brand/30">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-brand">Go Live (Mainnet Activation)</h2>
            <StackBadge status="pending" />
          </div>
          <p className="text-sm text-muted">
            To activate production APIs and start processing real fiat, you must complete your compliance profile.
          </p>
          <div className="rounded-lg border border-line bg-surface-2 p-4 space-y-3">
            <Row label="Legal Entity Name" value={tenant?.legal_entity_name || 'Not provided'} />
            <Row label="Company Type" value={tenant?.company_type || 'Not provided'} />
            <Row label="Use Case" value={(tenant as any)?.use_case || 'Not provided'} />
            <Row label="Country" value={tenant?.country || 'Not provided'} />
            <Row label="FIU-IND Registration" value={tenant?.fiu_registration_status || 'Pending Verification'} />
          </div>
          <button className="w-full rounded-lg bg-brand py-3 text-sm font-medium text-white transition-opacity hover:opacity-90">
            Complete Compliance Profile →
          </button>
        </Card>

        {/* Team */}
        <Card className="space-y-3 p-6">
          <h2 className="font-semibold">Team</h2>
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
            <div>
              <div className="text-sm text-ink">You</div>
              <div className="text-xs text-muted">fi-operator</div>
            </div>
            <span className="rounded-full bg-brand/15 px-2 py-1 text-xs text-brand ring-1 ring-brand/25">Admin</span>
          </div>
          <button className="w-full rounded-lg border border-dashed border-line py-3 text-sm text-muted transition-colors hover:border-brand/50 hover:text-ink">
            + Invite team member
          </button>
        </Card>

        {/* Stellar Expert Links */}
        {distKey && (
          <Card className="space-y-3 p-6">
            <h2 className="font-semibold">Explorer Links</h2>
            <a href={`https://stellar.expert/explorer/testnet/account/${distKey.public_key}`}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 transition-colors hover:bg-line/20">
              <span className="text-sm text-ink">Distribution Account on Stellar Expert</span>
              <span className="text-muted">↗</span>
            </a>
            {issuerKey && (
              <a href={`https://stellar.expert/explorer/testnet/account/${issuerKey.public_key}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 transition-colors hover:bg-line/20">
                <span className="text-sm text-ink">Issuer Account on Stellar Expert</span>
                <span className="text-muted">↗</span>
              </a>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted">{label}</div>
      <div className="text-sm capitalize text-ink">{value}</div>
    </div>
  );
}

function ProviderRow({ label, value }: { label: string; value?: string }) {
  const real = value && value !== 'mock';
  return (
    <div className="rounded-lg bg-surface-2 px-4 py-3">
      <div className="mb-1 text-xs text-muted">{label}</div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset ${real ? 'bg-brand/10 text-brand-deep ring-brand/20' : 'bg-surface text-muted ring-line'}`}>
        {value ?? 'mock'}
      </span>
    </div>
  );
}
