'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { provisionAnchor, getAnchor, setSelectedAnchor, Anchor, StackStatus } from '@/lib/cp';
import { Logo, Card, Button, Spinner } from '@/components/ui';

const STEPS = [
  'Generating keypairs',
  'Funding accounts & issuing asset on Stellar',
  'Generating config',
  'Creating database & containers',
  'Waiting for stack to become healthy',
];

const ROLES: { role: 'signing' | 'distribution' | 'issuer'; label: string }[] = [
  { role: 'signing',      label: 'Signing (SEP-10 auth)' },
  { role: 'distribution', label: 'Distribution (holds asset)' },
  { role: 'issuer',       label: 'Issuer (mints asset)' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [anchorId, setAnchorId] = useState('');
  const [anchor, setAnchor]     = useState<Anchor | null>(null);
  const [error, setError]       = useState('');
  const started = useRef(false);

  const status: StackStatus = anchor?.stack_status ?? 'pending';
  const detail = anchor?.status_detail ?? 'Starting…';
  const currentStep = STEPS.findIndex(s => detail.startsWith(s.split(' ')[0]));

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('anchor') ?? '';
    if (!id) { router.push('/anchor/anchors'); return; }
    setAnchorId(id);
    if (started.current) return;
    started.current = true;
    start(id);
  }, []);

  async function start(id: string) {
    try {
      await provisionAnchor(id);
    } catch (err: any) {
      if (!/already/i.test(err.message ?? '')) { setError(err.message); return; }
    }
    poll(id);
  }

  async function poll(id: string) {
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const a = await getAnchor(id);          // full record: status, keys, asset — reveals live
        setAnchor(a);
        if (a.stack_status === 'active') return;
        if (a.stack_status === 'error') { setError(a.status_detail ?? 'Provisioning failed.'); return; }
      } catch { /* retry */ }
    }
    setError('Provisioning timed out. Check the anchors list.');
  }

  const keyFor = (role: string) => anchor?.keypairs?.find(k => k.role === role)?.public_key;
  const distKey = keyFor('distribution');

  return (
    <div className="aurora flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="fade-up w-full max-w-xl">
        <div className="mb-8 flex justify-center"><Logo className="text-lg" /></div>

        <Card className="p-8">
          {error && (
            <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
              <button onClick={() => router.push('/anchor/anchors')} className="mt-3 block text-brand hover:underline">← Back to anchors</button>
            </div>
          )}

          {!error && status !== 'active' && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Spinner className="h-5 w-5" />
                <div>
                  <h2 className="font-semibold leading-tight">Provisioning your anchor…</h2>
                  <p className="text-xs text-muted">An isolated stack is being built on Stellar testnet.</p>
                </div>
              </div>

              {/* Step timeline */}
              <div className="space-y-3">
                {STEPS.map((s, i) => (
                  <div key={s} className={`flex items-center gap-3 text-sm ${i < currentStep ? 'text-success' : i === currentStep ? 'text-ink' : 'text-faint'}`}>
                    {i < currentStep ? <span>✓</span>
                      : i === currentStep ? <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                      : <span>○</span>}
                    <span>{s}</span>
                  </div>
                ))}
              </div>

              {/* Live reveal: keys + asset appear as the backend creates them */}
              <div className="mt-6 space-y-2 border-t border-line pt-5">
                {anchor?.asset_code && (
                  <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-xs">
                    <span className="text-muted">Asset</span>
                    <span className="font-mono text-ink">{anchor.asset_code}</span>
                  </div>
                )}
                {ROLES.map(({ role, label }) => {
                  const pk = keyFor(role);
                  return (
                    <div key={role} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-xs">
                      <span className="shrink-0 text-muted">{label}</span>
                      {pk
                        ? <span className="truncate font-mono text-success">✓ {pk.slice(0, 6)}…{pk.slice(-6)}</span>
                        : <span className="text-faint">waiting…</span>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 text-xs text-muted">{detail}</div>
            </div>
          )}

          {!error && status === 'active' && (
            <div className="text-center fade-up">
              <div className="mb-3 text-4xl">🎉</div>
              <h2 className="text-xl font-bold">Your anchor is live on testnet</h2>
              <p className="mt-1 text-sm text-muted">{anchor?.name} · {anchor?.asset_code}</p>

              <div className="mt-6 space-y-2 text-left">
                {anchor?.home_domain && (
                  <a href={`http://${anchor.home_domain}/.well-known/stellar.toml`} target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm transition-colors hover:bg-line/20">
                    <span className="text-ink">SEP-1 stellar.toml</span>
                    <span className="font-mono text-brand">{anchor.home_domain} ↗</span>
                  </a>
                )}
                {distKey && (
                  <a href={`https://stellar.expert/explorer/testnet/account/${distKey}`} target="_blank" rel="noopener noreferrer"
                     className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm transition-colors hover:bg-line/20">
                    <span className="text-ink">Distribution account</span>
                    <span className="text-brand">Stellar Expert ↗</span>
                  </a>
                )}
              </div>

              <div className="mt-8 flex justify-center gap-3">
                <Button onClick={() => { setSelectedAnchor(anchorId); router.push('/anchor/dashboard'); }}>Open dashboard →</Button>
                <Button variant="outline" onClick={() => router.push('/anchor/anchors')}>All anchors</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
