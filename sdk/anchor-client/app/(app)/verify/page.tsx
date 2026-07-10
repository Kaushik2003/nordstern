'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Clock, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import { customer as identityApi } from '@/lib/customer';
import { startKyc } from '@/lib/anchor';
import { useCustomer } from '@/components/customer-context';
import { useBrand } from '@/components/brand-context';
import { Card, CardBody, Button, Spinner } from '@/components/ui';

type View = 'intro' | 'processing' | 'approved' | 'pending' | 'declined';

function viewFor(status: string): View {
  if (status === 'approved') return 'approved';
  if (status === 'declined') return 'declined';
  if (status === 'pending') return 'pending';
  return 'intro';
}

export default function VerifyPage() {
  const { customer, refresh } = useCustomer();
  const brand = useBrand();
  const router = useRouter();
  const [view, setView] = useState<View>(viewFor(customer?.kycStatus ?? 'unverified'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll the CENTRAL status (updated server-to-server after DIDIT) while waiting.
  useEffect(() => {
    if (view !== 'processing' && view !== 'pending') return;
    poll.current = setInterval(async () => {
      const { kycStatus } = await identityApi.kyc().catch(() => ({ kycStatus: 'unverified' as const }));
      if (kycStatus === 'approved' || kycStatus === 'declined') {
        setView(kycStatus === 'approved' ? 'approved' : 'declined');
        await refresh();
      }
    }, 4000);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [view, refresh]);

  async function start() {
    setBusy(true); setError('');
    try {
      const { url } = await startKyc(`${window.location.origin}/verify`);
      window.open(url, '_blank', 'noopener');
      setView('processing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start verification');
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-ink">Verify your identity</h1>

      {view === 'approved' && (
        <Result icon={<CheckCircle2 className="h-16 w-16 text-[var(--color-success)]" />} title="You’re verified"
          body="You can now buy and sell. You won’t need to do this again." cta="Start buying" onCta={() => router.push('/buy')} />
      )}

      {view === 'declined' && (
        <Result icon={<XCircle className="h-16 w-16 text-[var(--color-danger)]" />} title="We couldn’t verify you"
          body="Something didn’t match. You can try again, or contact support if this keeps happening."
          cta="Try again" onCta={() => setView('intro')} secondary={{ label: 'Contact support', onClick: () => router.push('/support') }} />
      )}

      {view === 'processing' && (
        <Card><CardBody className="flex flex-col items-center gap-3 py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-brand" />
          <p className="font-semibold text-ink">Finishing verification…</p>
          <p className="max-w-xs text-sm text-muted">Complete the steps in the window that opened. This screen updates automatically when you’re done.</p>
        </CardBody></Card>
      )}

      {view === 'pending' && (
        <Result icon={<Clock className="h-16 w-16 text-[var(--color-warning)]" />} title="Verification in review"
          body="We’re reviewing your details. This is usually quick — we’ll update this screen when it’s done." />
      )}

      {view === 'intro' && (
        <>
          <Card><CardBody className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/15"><ShieldCheck className="h-7 w-7 text-brand-deep" /></div>
            <p className="font-semibold text-ink">A quick identity check</p>
            <p className="max-w-xs text-sm text-muted">It takes about a minute. You’ll need a photo ID. This keeps {brand.name} safe for everyone — and you only do it once.</p>
          </CardBody></Card>
          {error && <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
          <Button size="block" disabled={busy} onClick={start}>
            {busy ? <><Spinner className="h-5 w-5" /> Starting…</> : <>Start verification <ArrowRight className="h-4 w-4" /></>}
          </Button>
          <p className="text-center text-xs text-faint">Powered by DIDIT · your data is handled securely</p>
        </>
      )}
    </div>
  );
}

function Result({ icon, title, body, cta, onCta, secondary }: {
  icon: React.ReactNode; title: string; body: string; cta?: string; onCta?: () => void; secondary?: { label: string; onClick: () => void };
}) {
  return (
    <Card><CardBody className="flex flex-col items-center gap-3 py-10 text-center">
      {icon}
      <p className="text-xl font-bold text-ink">{title}</p>
      <p className="max-w-xs text-sm text-muted">{body}</p>
      <div className="mt-2 flex w-full flex-col gap-2">
        {cta && onCta && <Button size="block" onClick={onCta}>{cta}</Button>}
        {secondary && <Button variant="outline" size="block" onClick={secondary.onClick}>{secondary.label}</Button>}
      </div>
    </CardBody></Card>
  );
}
