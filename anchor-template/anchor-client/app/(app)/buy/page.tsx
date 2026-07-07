'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownToLine, ShieldCheck, Wallet, ArrowRight, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { useCustomer } from '@/components/customer-context';
import { Card, CardBody, Button, Spinner, Badge } from '@/components/ui';
import { getQuote, startBuy, getTx, type CustomerTx } from '@/lib/anchor';
import { settler, type SettlementSession } from '@/lib/settlement';
import { inr } from '@/lib/format';

type Step = 'amount' | 'confirm' | 'pay' | 'processing' | 'done' | 'error';

const PHASE_LABEL: Record<string, string> = {
  awaiting_payment: 'Waiting for your payment',
  payment_received: 'Payment received',
  processing: 'Processing your money',
  completing: 'Almost done',
  completed: 'Money added',
  failed: 'Couldn’t complete',
  refunded: 'Refunded',
};

export default function BuyPage() {
  const brand = useBrand();
  const { customer } = useCustomer();
  const router = useRouter();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<{ inrAmount: string; inrPerUnit: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SettlementSession | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [tx, setTx] = useState<CustomerTx | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const verified = customer?.kycStatus === 'approved';

  // Live quote as the amount changes.
  useEffect(() => {
    const n = Number(amount);
    if (!n || n <= 0) { setQuote(null); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const q = await getQuote(n, 'buy'); if (alive) setQuote({ inrAmount: q.inrAmount ?? '0', inrPerUnit: q.inrPerUnit }); }
      catch { if (alive) setQuote(null); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [amount]);

  // Poll transaction status during processing.
  useEffect(() => {
    if (step !== 'processing' || !txId || !session) return;
    poll.current = setInterval(async () => {
      const t = await getTx(txId, session.token).catch(() => null);
      if (!t) return;
      setTx(t);
      if (t.phase === 'completed') { setStep('done'); }
      else if (t.phase === 'failed' || t.phase === 'refunded') { setStep('error'); setError('This transaction didn’t complete. No money was taken if you weren’t charged.'); }
    }, 3000);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [step, txId, session]);

  async function confirmAndAuthorize() {
    setBusy(true); setError('');
    try {
      // Connect a wallet if needed, then the "secure confirmation" (wallet signs).
      const addr = (await settler.available()) ?? (await settler.connect());
      const s = await settler.authorize(addr);
      setSession(s);
      const { id, paymentUrl } = await startBuy(s, Number(amount).toFixed(2), brand.assetCode);
      setTxId(id); setPayUrl(paymentUrl); setStep('pay');
    } catch (e) {
      setError(e instanceof Error ? friendly(e.message) : 'Could not start your buy');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-brand-deep" /><h1 className="text-2xl font-bold text-ink">Buy</h1></div>

      {!verified && step === 'amount' && (
        <Card className="border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)]/40">
          <CardBody className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--color-warning)]" />
            <p className="flex-1 text-sm text-ink">Verify your identity first — it only takes a minute.</p>
            <Button size="sm" variant="outline" onClick={() => router.push('/profile')}>Verify</Button>
          </CardBody>
        </Card>
      )}

      {step === 'amount' && (
        <>
          <Card><CardBody className="space-y-4">
            <div>
              <label className="text-sm text-muted">You buy</label>
              <div className="mt-1 flex items-baseline gap-2">
                <input autoFocus inputMode="decimal" placeholder="0" value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full bg-transparent text-4xl font-bold text-ink outline-none" />
                <span className="text-lg font-semibold text-muted">{brand.assetCode}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-muted">You pay</span>
              <span className="font-semibold text-ink">{quote ? inr(quote.inrAmount) : '—'}</span>
            </div>
            {quote && <p className="text-xs text-faint">1 {brand.assetCode} ≈ {inr(quote.inrPerUnit)}</p>}
          </CardBody></Card>
          {error && <Msg tone="error" text={error} />}
          <Button size="block" disabled={!quote || busy} onClick={() => setStep('confirm')}>Continue <ArrowRight className="h-4 w-4" /></Button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <Card><CardBody className="space-y-3">
            <Row label="You buy" value={`${amount} ${brand.assetCode}`} />
            <Row label="You pay" value={inr(quote?.inrAmount)} strong />
            <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-muted">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              <span>You’ll confirm securely in your wallet to receive your {brand.assetCode}. Then pay with UPI.</span>
            </div>
          </CardBody></Card>
          {error && <Msg tone="error" text={error} />}
          <Button size="block" disabled={busy} onClick={confirmAndAuthorize}>
            {busy ? <><Spinner className="h-5 w-5" /> Confirming…</> : <><ShieldCheck className="h-4 w-4" /> Confirm securely</>}
          </Button>
          <button className="w-full text-center text-sm text-muted hover:text-ink" onClick={() => setStep('amount')}>Back</button>
        </>
      )}

      {step === 'pay' && payUrl && (
        <>
          <Card><CardBody className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15"><ExternalLink className="h-6 w-6 text-brand-deep" /></div>
            <p className="font-medium text-ink">Complete your payment</p>
            <p className="max-w-xs text-sm text-muted">Pay {inr(quote?.inrAmount)} securely with UPI to receive {amount} {brand.assetCode}.</p>
            <a href={payUrl} target="_blank" rel="noopener noreferrer" className="w-full" onClick={() => setTimeout(() => setStep('processing'), 500)}>
              <Button size="block">Pay {inr(quote?.inrAmount)}</Button>
            </a>
            <button className="text-sm text-muted hover:text-ink" onClick={() => setStep('processing')}>I’ve paid — track my money</button>
          </CardBody></Card>
        </>
      )}

      {step === 'processing' && (
        <Card><CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <div>
            <p className="font-semibold text-ink">{PHASE_LABEL[tx?.phase ?? 'processing']}</p>
            <p className="mt-1 text-sm text-muted">This usually takes a minute. You can leave this screen — it’ll keep going.</p>
          </div>
          <Steps phase={tx?.phase ?? 'processing'} />
        </CardBody></Card>
      )}

      {step === 'done' && (
        <Card><CardBody className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-14 w-14 text-[var(--color-success)]" />
            <p className="text-xl font-bold text-ink">Money added</p>
            <p className="text-sm text-muted">{amount} {brand.assetCode} is now in your wallet.</p>
          </div>
          <div className="space-y-2 rounded-xl bg-surface p-4">
            <Row label="Amount" value={`${tx?.assetAmount ?? amount} ${brand.assetCode}`} />
            <Row label="You paid" value={inr(tx?.inrAmount ?? quote?.inrAmount)} />
            <Row label="Reference" value={tx?.reference ?? txId?.slice(0, 8).toUpperCase() ?? '—'} />
            <Row label="Completed" value={tx?.completedAt ? new Date(tx.completedAt).toLocaleString() : 'Just now'} />
            <div className="flex items-center justify-between"><span className="text-sm text-muted">Status</span><Badge tone="success">Completed</Badge></div>
          </div>
          <Advanced tx={tx} />
          <Button variant="outline" size="block" onClick={() => router.push('/home')}>Done</Button>
        </CardBody></Card>
      )}

      {step === 'error' && (
        <Card><CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-12 w-12 text-[var(--color-danger)]" />
          <p className="text-lg font-bold text-ink">Couldn’t complete</p>
          <p className="max-w-xs text-sm text-muted">{error}</p>
          <Button variant="outline" size="block" onClick={() => { setStep('amount'); setError(''); setTx(null); }}>Try again</Button>
        </CardBody></Card>
      )}
    </div>
  );
}

function friendly(msg: string): string {
  if (/freighter|not installed|not connected/i.test(msg)) return 'You need a connected wallet to receive your money. Install a Stellar wallet and try again.';
  if (/trustline/i.test(msg)) return 'Your wallet needs to enable this asset first. Open your wallet, add it, then try again.';
  if (/verification|kyc|accepted/i.test(msg)) return 'Please complete identity verification before buying.';
  return 'Something went wrong starting your buy. Please try again.';
}

function Row({ label, value, strong }: { label: string; value: string | null | undefined; strong?: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><span className={strong ? 'text-lg font-bold text-ink' : 'font-medium text-ink'}>{value ?? '—'}</span></div>;
}
function Msg({ tone, text }: { tone: 'error'; text: string }) {
  return <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{text}</div>;
}
// Technical blockchain details, hidden by default — only for the curious.
function Advanced({ tx }: { tx: CustomerTx | null }) {
  const [open, setOpen] = useState(false);
  if (!tx) return null;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-xs text-faint hover:text-muted">{open ? 'Hide' : 'Advanced'} details</button>
      {open && (
        <div className="mt-2 space-y-1 rounded-lg bg-surface p-3 font-mono text-[11px] text-muted">
          <div>tx: {tx.id}</div>
          {tx.stellarId && <div className="break-all">chain: {tx.stellarId}</div>}
          {tx.destination && <div className="break-all">wallet: {tx.destination}</div>}
          <div>status: {tx.rawStatus}</div>
        </div>
      )}
    </div>
  );
}
function Steps({ phase }: { phase: string }) {
  const order = ['awaiting_payment', 'payment_received', 'processing', 'completing', 'completed'];
  const labels = ['Payment', 'Received', 'Processing', 'Completing', 'Done'];
  const idx = Math.max(0, order.indexOf(phase));
  return (
    <div className="flex w-full items-center justify-between px-2">
      {labels.map((l, i) => (
        <div key={l} className="flex flex-col items-center gap-1">
          <div className={`h-2.5 w-2.5 rounded-full ${i <= idx ? 'bg-brand' : 'bg-surface-2'}`} />
          <span className={`text-[10px] ${i <= idx ? 'text-ink' : 'text-faint'}`}>{l}</span>
        </div>
      ))}
    </div>
  );
}
