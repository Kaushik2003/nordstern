'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpFromLine, ShieldCheck, Wallet, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { useCustomer } from '@/components/customer-context';
import { Card, CardBody, Button, Spinner, Badge } from '@/components/ui';
import { getQuote, startSell, myTransaction, withdrawInstructions, sendWithdrawal, type CustomerTx } from '@/lib/anchor';
import { customer as customerApi } from '@/lib/customer';
import { settler, type SettlementSession } from '@/lib/settlement';
import { inr } from '@/lib/format';

type Step = 'amount' | 'confirm' | 'send' | 'processing' | 'done' | 'error';

const PHASE_LABEL: Record<string, string> = {
  awaiting_payment: 'Waiting for your transfer',
  processing: 'Processing your payout',
  completing: 'Sending to your bank',
  completed: 'Cash sent',
  failed: 'Couldn’t complete',
  refunded: 'Returned',
};

export default function SellPage() {
  const brand = useBrand();
  const { customer } = useCustomer();
  const router = useRouter();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<{ inrAmount: string; inrPerUnit: string } | null>(null);
  const [limits, setLimits] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SettlementSession | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [tx, setTx] = useState<CustomerTx | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const verified = customer?.kycStatus === 'approved';

  // Load min/max once so we validate as the user types (before any handoff).
  useEffect(() => {
    getQuote(1, 'sell')
      .then((q) => setLimits({ min: q.minAmount ?? null, max: q.maxAmount ?? null }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const n = Number(amount);
    if (!n || n <= 0) { setQuote(null); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const q = await getQuote(n, 'sell'); if (alive) setQuote({ inrAmount: q.inrAmount ?? '0', inrPerUnit: q.inrPerUnit }); }
      catch { if (alive) setQuote(null); }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [amount]);

  const nAmount = Number(amount);
  const limitError =
    limits.min != null && nAmount > 0 && nAmount < limits.min
      ? `Minimum is ${limits.min} ${brand.assetCode}`
      : limits.max != null && nAmount > limits.max
        ? `Maximum is ${limits.max} ${brand.assetCode}`
        : '';

  useEffect(() => {
    if (step !== 'processing' || !txId || !session) return;
    poll.current = setInterval(async () => {
      // Customer-session poll (cookie-auth) — SEP-10 /sep/tx/:id 404s for the native app.
      const t = await myTransaction(txId).catch(() => null);
      if (!t) return; setTx(t);
      if (t.phase === 'completed') setStep('done');
      else if (t.phase === 'failed' || t.phase === 'refunded') { setStep('error'); setError('This transaction didn’t complete.'); }
    }, 3000);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [step, txId, session]);

  async function confirmAndAuthorize() {
    setBusy(true); setError('');
    try {
      const addr = (await settler.available()) ?? (await settler.connect());
      // Link this wallet to the central customer so KYC (verified once) is reused. Best-effort.
      customerApi.addWallet(addr).catch(() => {});
      const s = await settler.authorize(addr); setSession(s);
      const { id } = await startSell(s, Number(amount).toFixed(2), brand.assetCode);
      setTxId(id); setStep('send');
    } catch (e) { setError(e instanceof Error ? 'Could not start your sell. Please try again.' : 'Error'); }
    finally { setBusy(false); }
  }

  // Native "click to send": build the transfer to the treasury, pop the wallet to confirm,
  // submit, then advance to the live tracking panel (the processing poll detects receipt →
  // payout → done automatically).
  async function doSend() {
    if (!txId || !session) return;
    setBusy(true); setError('');
    try {
      const { treasury, memo } = await withdrawInstructions(txId);
      await sendWithdrawal(session.walletAddress, treasury, Number(amount).toFixed(2), memo);
      setStep('processing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2"><ArrowUpFromLine className="h-5 w-5 text-brand-deep" /><h1 className="text-2xl font-bold text-ink">Sell</h1></div>

      {!verified && step === 'amount' && (
        <Card className="border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)]/40"><CardBody className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[var(--color-warning)]" /><p className="flex-1 text-sm text-ink">Verify your identity first.</p>
          <Button size="sm" variant="outline" onClick={() => router.push('/verify')}>Verify</Button>
        </CardBody></Card>
      )}

      {step === 'amount' && (
        <>
          <Card><CardBody className="space-y-4">
            <div>
              <label className="text-sm text-muted">You sell</label>
              <div className="mt-1 flex items-baseline gap-2">
                <input autoFocus inputMode="decimal" placeholder="0" value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full bg-transparent text-4xl font-bold text-ink outline-none" />
                <span className="text-lg font-semibold text-muted">{brand.assetCode}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
              <span className="text-muted">You receive</span><span className="font-semibold text-ink">{quote ? inr(quote.inrAmount) : '—'}</span>
            </div>
            {quote && !limitError && <p className="text-xs text-faint">1 {brand.assetCode} ≈ {inr(quote.inrPerUnit)}</p>}
            {limitError
              ? <p className="text-xs font-medium text-[var(--color-danger)]">{limitError}</p>
              : (limits.min != null && limits.max != null) &&
                <p className="text-xs text-faint">Between {limits.min} and {limits.max} {brand.assetCode} per transaction</p>}
          </CardBody></Card>
          {error && <Msg text={error} />}
          <Button size="block" disabled={!quote || busy || !!limitError} onClick={() => setStep('confirm')}>Continue <ArrowRight className="h-4 w-4" /></Button>
        </>
      )}

      {step === 'confirm' && (
        <>
          <Card><CardBody className="space-y-3">
            <Row label="You sell" value={`${amount} ${brand.assetCode}`} />
            <Row label="You receive" value={inr(quote?.inrAmount)} strong />
            <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-muted">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" /><span>Your wallet will ask you to approve — this just proves the wallet is yours. Nothing leaves your wallet yet: you’ll send the {brand.assetCode} on the next step, then we pay the cash to your bank.</span>
            </div>
          </CardBody></Card>
          {error && <Msg text={error} />}
          <Button size="block" disabled={busy} onClick={confirmAndAuthorize}>{busy ? <><Spinner className="h-5 w-5" /> Confirming…</> : <><ShieldCheck className="h-4 w-4" /> Confirm securely</>}</Button>
          <button className="w-full text-center text-sm text-muted hover:text-ink" onClick={() => setStep('amount')}>Back</button>
        </>
      )}

      {step === 'send' && (
        <Card><CardBody className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15"><Wallet className="h-6 w-6 text-brand-deep" /></div>
          <p className="font-medium text-ink">Send {amount} {brand.assetCode}</p>
          <p className="max-w-xs text-sm text-muted">Confirm the transfer in your wallet. We’ll detect it automatically and pay {inr(quote?.inrAmount)} to your bank — no copying or memos needed.</p>
          {error && <Msg text={error} />}
          <Button size="block" disabled={busy} onClick={doSend}>
            {busy ? <><Spinner className="h-5 w-5" /> Confirm in your wallet…</> : <><Wallet className="h-4 w-4" /> Send from wallet</>}
          </Button>
          <button className="text-sm text-muted hover:text-ink" onClick={() => { setStep('confirm'); setError(''); }}>Back</button>
        </CardBody></Card>
      )}

      {step === 'processing' && (
        <Card><CardBody className="flex flex-col items-center gap-4 py-10 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand" />
          <div><p className="font-semibold text-ink">{PHASE_LABEL[tx?.phase ?? 'processing']}</p><p className="mt-1 text-sm text-muted">This usually takes a minute.</p></div>
        </CardBody></Card>
      )}

      {step === 'done' && (
        <Card><CardBody className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-14 w-14 text-[var(--color-success)]" />
            <p className="text-xl font-bold text-ink">Cash sent</p><p className="text-sm text-muted">{inr(tx?.inrAmount ?? quote?.inrAmount)} is on its way to your bank.</p>
          </div>
          <div className="space-y-2 rounded-xl bg-surface p-4">
            <Row label="Sold" value={`${amount} ${brand.assetCode}`} />
            <Row label="Credited to bank" value={inr(tx?.inrAmount ?? quote?.inrAmount)} strong />
            <Row label="UTR" value={tx?.payoutReference ?? tx?.reference ?? txId?.slice(0, 8).toUpperCase() ?? '—'} />
            <div className="flex items-center justify-between"><span className="text-sm text-muted">Status</span><Badge tone="success">Paid</Badge></div>
          </div>
          <Button variant="outline" size="block" onClick={() => router.push('/home')}>Done</Button>
        </CardBody></Card>
      )}

      {step === 'error' && (
        <Card><CardBody className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-12 w-12 text-[var(--color-danger)]" /><p className="text-lg font-bold text-ink">Couldn’t complete</p>
          <p className="max-w-xs text-sm text-muted">{error}</p>
          <Button variant="outline" size="block" onClick={() => { setStep('amount'); setError(''); setTx(null); }}>Try again</Button>
        </CardBody></Card>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string | null | undefined; strong?: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><span className={strong ? 'text-lg font-bold text-ink' : 'font-medium text-ink'}>{value ?? '—'}</span></div>;
}
function Msg({ text }: { text: string }) { return <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">{text}</div>; }
