'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowDownToLine, ShieldCheck, Wallet, ArrowRight, ExternalLink, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useBrand } from '@/components/brand-context';
import { useCustomer } from '@/components/customer-context';
import { Panel, PanelHead, Button, Spinner, Badge, reveal } from '@/components/ui';
import { FadeUp } from '@/components/motion';
import { getQuote, startBuy, myTransaction, type CustomerTx } from '@/lib/anchor';
import { ensureWalletLinked } from '@/lib/link-wallet';
import { settler, type SettlementSession } from '@/lib/settlement';
import { inr } from '@/lib/format';
import { getAccount, friendbot, buildTrustlineXdr, submitXdr } from '@/lib/api';
import { signTransaction } from '@/lib/wallet';
import { DiditMark } from '@/components/ecosystem';

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
  const [limits, setLimits] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<SettlementSession | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [tx, setTx] = useState<CustomerTx | null>(null);
  const [addingTrustline, setAddingTrustline] = useState(false);
  // Whether the connected wallet is missing this asset's trustline. Tracked explicitly
  // (not by string-matching `error`) because friendly() rewrites the message and drops the
  // word "trustline", which would hide the "Enable {asset}" button.
  const [needsTrustline, setNeedsTrustline] = useState(false);
  // The anchor's official asset issuer — shown so the customer trusts the RIGHT asset (a
  // same-code trustline to another issuer is common on testnet and silently breaks delivery).
  const [assetIssuer, setAssetIssuer] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const verified = customer?.kycStatus === 'approved';

  // Load the anchor's min/max once so we can validate as the user types (before any handoff).
  useEffect(() => {
    getQuote(1, 'buy')
      .then((q) => {
        setLimits({ min: q.minAmount ?? null, max: q.maxAmount ?? null });
        if (q.assetIssuer) setAssetIssuer(q.assetIssuer);
      })
      .catch(() => {});
  }, []);

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

  // Validate the amount against the anchor's operational bounds, live.
  const nAmount = Number(amount);
  const limitError =
    limits.min != null && nAmount > 0 && nAmount < limits.min
      ? `Minimum is ${limits.min} ${brand.assetCode}`
      : limits.max != null && nAmount > limits.max
        ? `Maximum is ${limits.max} ${brand.assetCode}`
        : '';

  // Poll transaction status during processing.
  useEffect(() => {
    if (step !== 'processing' || !txId || !session) return;
    poll.current = setInterval(async () => {
      // Poll the customer-session endpoint (cookie-auth, scoped to linked wallets) — the
      // SEP-10 /sep/tx/:id path 404s for the native app, leaving this screen spinning after
      // a completed deposit. myTransaction() sees the completed tx and phase flips to done.
      const t = await myTransaction(txId).catch(() => null);
      if (!t) return;
      setTx(t);
      if (t.phase === 'completed') { setStep('done'); }
      else if (t.phase === 'failed' || t.phase === 'refunded') { setStep('error'); setError('This transaction didn’t complete. No money was taken if you weren’t charged.'); }
    }, 3000);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [step, txId, session]);

  async function addTrustline() {
    setAddingTrustline(true);
    setError('');
    try {
      const addr = (await settler.available()) ?? (await settler.connect());

      const balances = await getAccount(addr);
      if (balances.error === 'Account not found' || balances.xlm === null) {
        if (process.env.NEXT_PUBLIC_IS_MAINNET === 'true') {
          throw new Error('Your Stellar account must be funded with some XLM first before enabling this asset.');
        } else {
          await friendbot(addr);
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      }

      const xdr = await buildTrustlineXdr(addr);
      const signed = await signTransaction(xdr);
      await submitXdr(signed);
      setError('');
      setNeedsTrustline(false);
      // Continue automatically
      await confirmAndAuthorize();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable asset');
    } finally {
      setAddingTrustline(false);
    }
  }

  async function confirmAndAuthorize() {
    setBusy(true); setError('');
    try {
      // Connect a wallet if needed, then the "secure confirmation" (wallet signs).
      const addr = (await settler.available()) ?? (await settler.connect());

      // Verify trustline is established
      const balances = await getAccount(addr);
      if (balances.error === 'Account not found' || balances.xlm === null) {
        if (process.env.NEXT_PUBLIC_IS_MAINNET === 'true') {
          throw new Error('Your Stellar account must be funded with some XLM first before enabling this asset.');
        } else {
          await friendbot(addr);
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      }

      const freshBalances = await getAccount(addr);
      if (freshBalances.anch === null) {
        throw new Error('trustline not found — please enable this asset in your wallet first.');
      }
      setNeedsTrustline(false);

      // Link this wallet to the central customer profile so a KYC done once is reused
      // across anchors AND the customer's history is scoped to it. Proven ownership only
      // (one extra signature the first time per wallet). Best-effort: a decline never blocks
      // the buy — the payment proceeds; only the central link is skipped.
      await ensureWalletLinked(addr).catch(() => {});
      const s = await settler.authorize(addr);
      setSession(s);
      const { id, paymentUrl } = await startBuy(s, Number(amount).toFixed(2), brand.assetCode);
      setTxId(id); setPayUrl(paymentUrl); setStep('pay');
    } catch (e) {
      const raw = e instanceof Error ? e.message : '';
      // Gate the "Enable {asset}" button on the RAW error, before friendly() rewrites it.
      setNeedsTrustline(/trustline|op_no_trust/i.test(raw));
      setError(e instanceof Error ? friendly(e.message) : 'Could not start your buy');
    } finally { setBusy(false); }
  }

  const TrustlineButton = ({ className }: { className?: string }) => (
    <Button size="block" variant="outline" disabled={addingTrustline} onClick={addTrustline} className={className}>
      {addingTrustline
        ? <span className="flex items-center justify-center gap-2"><Spinner className="h-4 w-4" /> Enabling asset…</span>
        : <span>Enable {brand.assetCode} in wallet</span>}
    </Button>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <FadeUp>
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><ArrowDownToLine className="h-5 w-5" /></span>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight text-ink">Buy {brand.assetCode}</h1>
            <p className="text-[12px] text-subtle">Convert INR to {brand.assetCode} and receive it in your wallet.</p>
          </div>
        </div>
      </FadeUp>

      {!verified && step === 'amount' && (
        <Panel style={reveal(0.04)} className="flex items-center gap-3 border-[color:color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[var(--color-warning-bg)]/40 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--color-warning)]" />
          <p className="flex-1 text-sm text-ink">Verify your identity first — it only takes a minute.</p>
          <Button size="sm" variant="outline" onClick={() => router.push('/verify')}>Verify</Button>
        </Panel>
      )}

      {step === 'amount' && (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Converter */}
          <div className="space-y-4">
            <Panel style={reveal(0.06)} className="space-y-5 p-5 sm:p-6">
              <div>
                <label className="text-[12.5px] font-medium text-muted">You buy</label>
                <div className="mt-2 flex items-baseline gap-2 rounded-xl border border-black/[0.06] bg-surface px-4 py-3 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                  <input autoFocus inputMode="decimal" placeholder="0" value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full bg-transparent text-4xl font-bold tracking-tight text-ink outline-none" />
                  <span className="text-lg font-semibold text-brand-700">{brand.assetCode}</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-sm">
                <span className="text-muted">You pay</span>
                <span className="text-lg font-bold tabular-nums text-ink">{quote ? inr(quote.inrAmount) : '—'}</span>
              </div>

              {quote && !limitError && (
                <p className="flex items-center justify-between text-xs text-subtle">
                  <span>Rate</span>
                  <span className="font-medium text-muted">1 {brand.assetCode} ≈ {inr(quote.inrPerUnit)}</span>
                </p>
              )}
              {limitError
                ? <p className="text-xs font-medium text-[var(--color-danger)]">{limitError}</p>
                : (limits.min != null && limits.max != null) &&
                  <p className="text-xs text-subtle">Between {limits.min} and {limits.max} {brand.assetCode} per transaction</p>}
            </Panel>

            {error && (
              <div className="space-y-3">
                <Msg tone="error" text={error} />
                {needsTrustline && <TrustlineButton />}
              </div>
            )}

            <Button variant="gradient" size="block" disabled={!quote || busy || !!limitError} onClick={() => setStep('confirm')}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Side info */}
          <div className="space-y-5">
            <Panel style={reveal(0.1)} className="p-5">
              <PanelHead title="How it works" />
              <div className="space-y-3">
                <StepRow Icon={ShieldCheck} title="Verify once" desc="A one-time identity check with DIDIT." />
                <StepRow Icon={ArrowDownToLine} title="Pay in INR" desc="Card or UPI, at the live rate." />
                <StepRow Icon={ArrowRight} title={`Receive ${brand.assetCode}`} desc="Delivered to your linked wallet." />
              </div>
            </Panel>

            <div className="flex items-start gap-3 rounded-mock border border-black/[0.05] bg-canvas p-4 text-[13px] text-muted" style={reveal(0.14)}>
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
              <p>Identity is verified securely with <DiditMark className="text-[13px]" />. Your wallet approval only proves ownership — it never moves money out.</p>
            </div>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="mx-auto max-w-md space-y-4">
          <Panel style={reveal(0.04)} className="space-y-3 p-5 sm:p-6">
            <Row label="You buy" value={`${amount} ${brand.assetCode}`} />
            <Row label="You pay" value={inr(quote?.inrAmount)} strong />
            <div className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-xs text-muted">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your wallet will ask you to approve — this just proves the wallet is yours so we deliver to the right place. It never moves money out of your wallet. Then you pay with UPI.</span>
            </div>
          </Panel>
          {error && (
            <div className="space-y-3">
              <Msg tone="error" text={error} />
              {needsTrustline && (
                <>
                  <TrustlineButton />
                  {assetIssuer && (
                    <p className="text-center text-[11px] text-subtle break-all">
                      Official {brand.assetCode} issuer: {assetIssuer.slice(0, 6)}…{assetIssuer.slice(-6)}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          <Button variant="gradient" size="block" disabled={busy} onClick={confirmAndAuthorize}>
            {busy ? <><Spinner className="h-5 w-5" /> Confirming…</> : <><ShieldCheck className="h-4 w-4" /> Confirm securely</>}
          </Button>
          <button className="w-full text-center text-sm text-muted transition-colors hover:text-ink" onClick={() => setStep('amount')}>Back</button>
        </div>
      )}

      {step === 'pay' && payUrl && (
        <div className="mx-auto max-w-md">
          <Panel style={reveal(0.04)} className="flex flex-col items-center gap-3 p-6 text-center sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-700"><ExternalLink className="h-6 w-6" /></div>
            <p className="font-semibold text-ink">Complete your payment</p>
            <p className="max-w-xs text-sm text-muted">A secure payment window opens. Pay {inr(quote?.inrAmount)} with UPI or card — you’ll come back here automatically and we’ll deliver {amount} {brand.assetCode} to your wallet.</p>
            <Button variant="gradient" size="block" onClick={() => { openPaymentWindow(payUrl); setStep('processing'); }}>Continue to payment · {inr(quote?.inrAmount)}</Button>
            <button className="text-sm text-muted transition-colors hover:text-ink" onClick={() => setStep('processing')}>I’ve paid — track my money</button>
          </Panel>
        </div>
      )}

      {step === 'processing' && (
        <div className="mx-auto max-w-md">
          <Panel style={reveal(0.04)} className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
            <Loader2 className="h-10 w-10 animate-spin text-brand" />
            <div>
              <p className="font-semibold text-ink">{PHASE_LABEL[tx?.phase ?? 'processing']}</p>
              <p className="mt-1 text-sm text-muted">This usually takes a minute. You can leave this screen — it’ll keep going.</p>
            </div>
            <Steps phase={tx?.phase ?? 'processing'} />
          </Panel>
        </div>
      )}

      {step === 'done' && (
        <div className="mx-auto max-w-md">
          <Panel style={reveal(0.04)} className="space-y-4 p-5 sm:p-6">
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
          </Panel>
        </div>
      )}

      {step === 'error' && (
        <div className="mx-auto max-w-md">
          <Panel style={reveal(0.04)} className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <AlertCircle className="h-12 w-12 text-[var(--color-danger)]" />
            <p className="text-lg font-bold text-ink">Couldn’t complete</p>
            <p className="max-w-xs text-sm text-muted">{error}</p>
            {needsTrustline && <TrustlineButton className="mt-2" />}
            <Button variant="outline" size="block" onClick={() => { setStep('amount'); setError(''); setTx(null); setNeedsTrustline(false); }}>Try again</Button>
          </Panel>
        </div>
      )}
    </div>
  );
}

// Open the fiat payment page as a centered popup window (the pattern payment gateways use),
// not a new browser tab. Falls back to a normal tab if the browser blocks the popup.
function openPaymentWindow(url: string): void {
  const w = 460, h = 720;
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop = window.screenTop ?? window.screenY ?? 0;
  const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = dualLeft + (width - w) / 2;
  const top = dualTop + (height - h) / 2;
  const popup = window.open(
    url,
    'payment',
    `popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
  if (popup) { popup.focus(); return; }
  window.open(url, '_blank', 'noopener,noreferrer'); // popup blocked → fall back to a tab
}

function friendly(msg: string): string {
  if (/freighter|not installed|not connected/i.test(msg)) return 'You need a connected wallet to receive your money. Install a Stellar wallet and try again.';
  if (/trustline|op_no_trust/i.test(msg)) return 'Your wallet needs to enable this asset first. Open your wallet, add it, then try again.';
  if (/verification|kyc|accepted/i.test(msg)) return 'Please complete identity verification before buying.';
  return 'Something went wrong starting your buy. Please try again.';
}

function StepRow({ Icon, title, desc }: { Icon: typeof Info; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-brand-50 text-brand-700"><Icon className="h-[18px] w-[18px]" /></span>
      <div>
        <p className="text-[13px] font-medium text-ink">{title}</p>
        <p className="text-[11.5px] text-subtle">{desc}</p>
      </div>
    </div>
  );
}
function Row({ label, value, strong }: { label: string; value: string | null | undefined; strong?: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-sm text-muted">{label}</span><span className={strong ? 'text-lg font-bold tabular-nums text-ink' : 'font-medium tabular-nums text-ink'}>{value ?? '—'}</span></div>;
}
function Msg({ tone, text }: { tone: 'error'; text: string }) {
  return <div className="rounded-xl bg-[var(--color-danger-bg)] px-3 py-2.5 text-sm text-[var(--color-danger)]">{text}</div>;
}
// Technical blockchain details, hidden by default — only for the curious.
function Advanced({ tx }: { tx: CustomerTx | null }) {
  const [open, setOpen] = useState(false);
  if (!tx) return null;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-xs text-subtle transition-colors hover:text-muted">{open ? 'Hide' : 'Advanced'} details</button>
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
        <div key={l} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center">
            <span className={`h-1 flex-1 rounded-full ${i === 0 ? 'bg-transparent' : i <= idx ? 'bg-brand' : 'bg-surface-2'}`} />
            <span className={`grid size-4 shrink-0 place-items-center rounded-full ${i <= idx ? 'bg-brand text-white' : 'bg-surface-2'}`}>
              {i <= idx && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            <span className={`h-1 flex-1 rounded-full ${i === labels.length - 1 ? 'bg-transparent' : i < idx ? 'bg-brand' : 'bg-surface-2'}`} />
          </div>
          <span className={`text-[10px] ${i <= idx ? 'font-medium text-ink' : 'text-subtle'}`}>{l}</span>
        </div>
      ))}
    </div>
  );
}
