'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { provisionAnchor, getAnchorStatus, setSelectedAnchor, StackStatus } from '@/lib/cp';

export default function OnboardingPage() {
  const router = useRouter();
  const [anchorId, setAnchorId] = useState('');
  const [status, setStatus]     = useState<StackStatus>('pending');
  const [detail, setDetail]     = useState('Starting…');
  const [homeDomain, setHomeDomain] = useState('');
  const [error, setError]       = useState('');
  const started = useRef(false);

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
      // Already provisioning/active — fall through to polling.
      if (!/already/i.test(err.message ?? '')) { setError(err.message); return; }
    }
    poll(id);
  }

  async function poll(id: string) {
    for (let i = 0; i < 80; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const s = await getAnchorStatus(id);
        setStatus(s.stack_status);
        if (s.status_detail) setDetail(s.status_detail);
        if (s.home_domain) setHomeDomain(s.home_domain);
        if (s.stack_status === 'active') return;
        if (s.stack_status === 'error') { setError(s.status_detail ?? 'Provisioning failed.'); return; }
      } catch { /* retry */ }
    }
    setError('Provisioning timed out. Check the anchors list.');
  }

  const steps = ['Generating keypairs', 'Funding accounts & issuing asset on Stellar', 'Generating config', 'Creating database & containers', 'Waiting for stack to become healthy'];
  const currentStep = steps.findIndex(s => detail.startsWith(s.split(' ')[0]));

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="text-center text-2xl font-bold mb-8">
          <span className="text-blue-400">⚓</span> Dockyard
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-5">
              {error}
              <button onClick={() => router.push('/anchor/anchors')} className="block mt-3 text-blue-400 hover:underline">← Back to anchors</button>
            </div>
          )}

          {!error && status !== 'active' && (
            <div>
              <h2 className="text-lg font-semibold mb-1">Provisioning your anchor…</h2>
              <p className="text-slate-400 text-sm mb-6">An isolated stack is being created on Stellar testnet. This takes a minute.</p>
              <div className="space-y-2">
                {steps.map((s, i) => (
                  <div key={s} className={`flex items-center gap-2 text-sm ${i < currentStep ? 'text-green-400' : i === currentStep ? 'text-blue-400' : 'text-slate-600'}`}>
                    {i < currentStep ? <span>✓</span>
                      : i === currentStep ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      : <span>○</span>}
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-500 mt-6">{detail}</div>
            </div>
          )}

          {!error && status === 'active' && (
            <div className="text-center">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="text-xl font-bold">Your anchor is live on Testnet</h2>
              {homeDomain && (
                <p className="text-slate-400 text-sm mt-2">
                  SEP-1: <a href={`http://${homeDomain}/.well-known/stellar.toml`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{homeDomain} ↗</a>
                </p>
              )}
              <div className="flex gap-3 justify-center mt-8">
                <button onClick={() => { setSelectedAnchor(anchorId); router.push('/anchor/dashboard'); }} className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-xl font-medium transition-colors">
                  Open Dashboard →
                </button>
                <button onClick={() => router.push('/anchor/anchors')} className="border border-slate-700 hover:border-slate-600 text-slate-300 py-3 px-6 rounded-xl font-medium transition-colors">
                  All anchors
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
