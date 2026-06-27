'use client';

import { useEffect, useState } from 'react';
import { getTenant, Tenant } from '@/lib/cp';

export default function SettingsPage() {
  const [tenant, setTenant]   = useState<Tenant | null>(null);
  const [copied, setCopied]   = useState('');

  useEffect(() => { getTenant().then(setTenant); }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const distKey = tenant?.keypairs?.find(k => k.role === 'distribution');
  const issuerKey = tenant?.keypairs?.find(k => k.role === 'issuer');

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Anchor Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold">Anchor Info</h2>
          <Row label="Company name" value={tenant?.name ?? '…'} />
          <Row label="Network" value={tenant?.network ?? '…'} />
          <Row label="Status" value={tenant?.status ?? '…'} />
          <div>
            <div className="text-xs text-slate-400 mb-1">Stellar.toml</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-blue-400">https://dockyard.app/t/{tenant?.slug}/.well-known/stellar.toml</span>
              <button onClick={() => copy(`https://dockyard.app/t/${tenant?.slug}/.well-known/stellar.toml`, 'toml')} className="text-slate-500 hover:text-white text-xs">
                {copied === 'toml' ? '✓' : '⧉'}
              </button>
            </div>
          </div>
        </div>

        {/* Stellar Accounts */}
        {tenant?.keypairs && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold">Stellar Accounts</h2>
            {tenant.keypairs.map(kp => (
              <div key={kp.role} className="bg-slate-800 rounded-lg px-4 py-3">
                <div className="text-xs text-slate-400 capitalize mb-1">{kp.role}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-300 truncate">{kp.public_key}</span>
                  <button onClick={() => copy(kp.public_key, kp.role)} className="text-slate-500 hover:text-white text-xs ml-3 shrink-0">
                    {copied === kp.role ? '✓ Copied' : '⧉'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Team */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold">Team</h2>
          <div className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
            <div>
              <div className="text-sm text-white">You</div>
              <div className="text-xs text-slate-400">fi-operator</div>
            </div>
            <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">Admin</span>
          </div>
          <button className="w-full border border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 text-sm py-3 rounded-lg transition-colors">
            + Invite team member
          </button>
        </div>

        {/* Stellar Expert Links */}
        {distKey && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <h2 className="font-semibold">Explorer Links</h2>
            <a href={`https://stellar.expert/explorer/testnet/account/${distKey.public_key}`}
               target="_blank" rel="noopener noreferrer"
               className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 hover:bg-slate-700 transition-colors">
              <span className="text-sm text-slate-300">Distribution Account on Stellar Expert</span>
              <span className="text-slate-500">↗</span>
            </a>
            {issuerKey && (
              <a href={`https://stellar.expert/explorer/testnet/account/${issuerKey.public_key}`}
                 target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 hover:bg-slate-700 transition-colors">
                <span className="text-sm text-slate-300">Issuer Account on Stellar Expert</span>
                <span className="text-slate-500">↗</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-sm text-slate-200 capitalize">{value}</div>
    </div>
  );
}
