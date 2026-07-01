'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { provision, getTenantStatus } from '@/lib/cp';

type Step = 'keypairs' | 'funding' | 'live';

interface Keypair { role: string; public_key: string; }

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]     = useState<Step>('keypairs');
  const [keys, setKeys]     = useState<Record<string, string>>({});
  const [tenantId, setTenantId] = useState('');
  const [log, setLog]       = useState<string[]>([]);
  const [error, setError]   = useState('');

  useEffect(() => {
    const id = localStorage.getItem('cp_tenant_id') ?? '';
    setTenantId(id);
    if (!id) { router.push('/anchor/signup'); return; }
    startProvisioning(id);
  }, []);

  function addLog(msg: string) { setLog(l => [...l, msg]); }

  async function startProvisioning(id: string) {
    try {
      const result = await provision(id);
      setKeys(result.accounts);
      setStep('funding');
      addLog('Keypairs generated');
      pollStatus(id);
    } catch (err: any) {
      // Already provisioned — just poll
      if (err.message?.includes('Already provisioned')) {
        setStep('funding');
        pollStatus(id);
      } else {
        setError(err.message);
      }
    }
  }

  async function pollStatus(id: string) {
    const logs: Record<string, boolean> = {};
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const s = await getTenantStatus(id);
        if (s.status === 'funding' && !logs['funding']) {
          addLog('Friendbot funding in progress...');
          logs['funding'] = true;
          // Extract public keys from keypairs
          if (s.keypairs?.length) {
            const kMap: Record<string, string> = {};
            s.keypairs.forEach((k: Keypair) => { kMap[k.role] = k.public_key; });
            setKeys(kMap);
          }
        }
        if (s.status === 'active') {
          addLog('Trustline created');
          addLog('1,000,000 ANCH minted to Distribution');
          addLog('Verified on Horizon');
          setStep('live');
          return;
        }
        if (s.status === 'error') {
          setError('Provisioning failed. Please contact support.');
          return;
        }
      } catch { /* retry */ }
    }
    setError('Provisioning timed out. Please refresh.');
  }

  const roleLabel: Record<string, string> = {
    signing: 'Signing Key (SEP-10 auth)',
    distribution: 'Distribution Account (holds ANCH)',
    issuer: 'Issuer Account (mints ANCH)',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="text-center text-2xl font-bold mb-8">
          <span className="text-blue-400">⚓</span> Dockyard
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-4 mb-8 text-sm">
          {(['keypairs', 'funding', 'live'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? 'bg-blue-600' :
                ['keypairs', 'funding', 'live'].indexOf(step) > i ? 'bg-green-600' : 'bg-slate-700'
              }`}>
                {['keypairs', 'funding', 'live'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              <span className={step === s ? 'text-white' : 'text-slate-500'}>
                {s === 'keypairs' ? 'Keypairs' : s === 'funding' ? 'Setup' : "You're Live"}
              </span>
              {i < 2 && <span className="text-slate-700">→</span>}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
            </div>
          )}

          {/* Step 1: Keypairs */}
          {step === 'keypairs' && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Generating your keypairs...</h2>
              <p className="text-slate-400 text-sm mb-6">Your anchor accounts are being created on Stellar.</p>
              <div className="flex items-center gap-3 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Generating cryptographic keypairs...</span>
              </div>
            </div>
          )}

          {/* Step 2: Funding */}
          {step === 'funding' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Setting up your anchor...</h2>

              {/* Show keypairs */}
              <div className="space-y-2 mb-6">
                {['signing', 'distribution', 'issuer'].map(role => (
                  <div key={role} className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{roleLabel[role]}</div>
                    <div className="font-mono text-xs text-slate-300 flex items-center justify-between gap-2">
                      <span className="truncate">{keys[role] ?? 'generating...'}</span>
                      {keys[role] && (
                        <button onClick={() => navigator.clipboard.writeText(keys[role])} className="text-slate-500 hover:text-white shrink-0">⧉</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress log */}
              <div className="space-y-2">
                {log.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-green-400">
                    <span>✓</span> <span>{l}</span>
                  </div>
                ))}
                {log.length < 4 && (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{log.length === 0 ? 'Funding via Friendbot...' : 'Setting up ANCH asset...'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Live */}
          {step === 'live' && (
            <div>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-xl font-bold">Your anchor is live on Testnet</h2>
                <p className="text-slate-400 text-sm mt-1">1,000,000 ANCH ready in your Distribution account</p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  { label: 'Distribution Account', key: 'distribution' },
                  { label: 'Issuer Account', key: 'issuer' },
                ].map(({ label, key }) => (
                  <div key={key} className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-400 mb-1">{label}</div>
                    <div className="font-mono text-xs text-slate-300 truncate">{keys[key]}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {log.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-green-400">
                    <span>✓</span> <span>{l}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => router.push('/anchor/(app)/dashboard')} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium mt-8 transition-colors">
                Open Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
