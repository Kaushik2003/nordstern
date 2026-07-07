'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  RefreshCw, Droplets, Plus, ArrowDownToLine, ArrowUpFromLine, Loader2, X, Send, History,
} from 'lucide-react';
import * as Freighter from '@/lib/freighter';
import * as API from '@/lib/api';
import { recordTx, loadTxs, type TxRef } from '@/lib/history';
import { useBrand } from '@/components/brand-context';
import { Header } from '@/components/site/header';
import { Hero } from '@/components/site/hero';
import { InfoSections } from '@/components/site/info-sections';
import { Footer } from '@/components/site/footer';
import { TxStatusCard, StatusPill } from '@/components/buy/tx-status';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reveal } from '@/components/motion/reveal';

interface LogEntry { msg: string; level: 'info' | 'ok' | 'error' }
interface PendingWithdrawal { txId: string; memo: string; amount: string; destination: string }

export default function Home() {
  const brand = useBrand();
  const ASSET = brand.assetCode;
  const isMainnet = process.env.NEXT_PUBLIC_IS_MAINNET === 'true';

  // Wallet
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState('');
  const jwtRef = useRef<string | null>(null);
  const [, _setJwt] = useState<string | null>(null);
  const setJwt = (t: string | null) => { jwtRef.current = t; _setJwt(t); };

  // Balances
  const [xlm, setXlm] = useState('—');
  const [anch, setAnch] = useState<string | null | undefined>(undefined);

  // Flow
  const [kind, setKind] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('10');
  const [acting, setActing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Withdrawal payment
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const pendingRef = useRef<PendingWithdrawal | null>(null);
  pendingRef.current = pending;
  const [sending, setSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<LogEntry[]>([]);

  // Transaction status + history
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [txData, setTxData] = useState<Record<string, unknown> | null>(null);
  const [history, setHistory] = useState<TxRef[]>([]);

  // ── Helpers (logic preserved) ──────────────────────────────────────────────
  const addLog = (set: React.Dispatch<React.SetStateAction<LogEntry[]>>, msg: string, level: LogEntry['level'] = 'info') =>
    set((prev) => [...prev, { msg, level }]);
  const log = (msg: string, level: LogEntry['level'] = 'info') => addLog(setLogs, msg, level);

  const loadBalances = useCallback(async (addr: string) => {
    setXlm('…'); setAnch(undefined);
    const d = await API.getAccount(addr);
    setXlm(d.xlm ? parseFloat(d.xlm).toFixed(2) : '—');
    setAnch(d.anch);
  }, []);

  const activate = useCallback((addr: string) => {
    setAddress(addr);
    setHistory(loadTxs(addr));
    loadBalances(addr);
  }, [loadBalances]);

  const startPoll = useCallback((id: string) => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    pollerRef.current = setInterval(async () => {
      const token = jwtRef.current;
      if (!token) return;
      const tx = await API.getTransaction(id, token);
      if (!tx) return;
      setTxData(tx);
      if (tx.status === 'completed' || tx.status === 'error') {
        clearInterval(pollerRef.current!);
        pollerRef.current = null;
      }
    }, 4000);
  }, []);

  useEffect(() => {
    Freighter.checkConnected().then((addr) => { if (addr) activate(addr); });
    return () => { if (pollerRef.current) clearInterval(pollerRef.current); };
  }, [activate]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const { type, txId, hash, memo, amount, destination } = (e.data ?? {}) as Record<string, string>;
      if (type === 'sep24_deposit_complete') {
        setIframeUrl(null);
        addLog(setLogs, `Deposit received${hash ? ` — ${hash.slice(0, 12)}…` : ''}`, 'ok');
        if (txId) startPoll(txId);
      }
      if (type === 'sep24_withdrawal_pending') {
        setIframeUrl(null);
        const p = { txId, memo, amount, destination };
        setPending(p); pendingRef.current = p;
        if (txId) startPoll(txId);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [startPoll]);

  async function ensureAuth(addr: string): Promise<string> {
    if (jwtRef.current) return jwtRef.current;
    log('Requesting sign-in challenge…');
    const xdr = await API.sep10Challenge(addr);
    log('Approve the sign-in request in your wallet…');
    const signed = await Freighter.signTransaction(xdr);
    const token = await API.sep10Submit(signed);
    setJwt(token);
    log('Signed in', 'ok');
    return token;
  }

  async function handleConnect() {
    setConnecting(true);
    setConnectMsg('⏳ Approve the connection in your wallet');
    try {
      const addr = await Freighter.connect();
      setConnectMsg('');
      activate(addr);
    } catch (err: unknown) {
      setConnectMsg(`❌ ${(err as Error).message}`);
    } finally {
      setConnecting(false);
    }
  }

  async function handleFund() {
    if (!address) return;
    try { await API.friendbot(address); setTimeout(() => loadBalances(address!), 5000); }
    catch (err: unknown) { alert((err as Error).message); }
  }

  async function handleTrustline() {
    if (!address) return;
    try {
      const xdr = await API.buildTrustlineXdr(address);
      const signed = await Freighter.signTransaction(xdr);
      await API.submitXdr(signed);
      setTimeout(() => loadBalances(address!), 3000);
    } catch (err: unknown) { alert((err as Error).message); }
  }

  async function handleAction() {
    if (!address) return;
    setLogs([]); setIframeUrl(null); setPending(null); setTxData(null); setActing(true);
    try {
      const token = await ensureAuth(address);
      log(`Starting ${kind === 'deposit' ? 'purchase' : 'sale'} of ${amount} ${ASSET}…`);
      const { id, url } = await API.initiateSep24(kind, amount, token, ASSET);
      const ref: TxRef = { id, kind, amount, startedAt: Date.now() };
      recordTx(address, ref);
      setHistory(loadTxs(address));
      setIframeUrl(url);
      startPoll(id);
    } catch (err: unknown) {
      log(`${(err as Error).message}`, 'error');
    } finally {
      setActing(false);
    }
  }

  async function handleSend() {
    const p = pendingRef.current;
    if (!p || !address) return;
    setSendLogs([]); setSending(true);
    const slog = (msg: string, level: LogEntry['level'] = 'info') => addLog(setSendLogs, msg, level);
    try {
      slog('Building payment…');
      const xdr = await API.buildPaymentXdr(address, p.destination, p.amount, p.memo);
      slog('Approve the payment in your wallet…');
      const signed = await Freighter.signTransaction(xdr);
      slog('Submitting to Stellar…');
      const hash = await API.submitXdr(signed);
      slog(`Sent — ${hash.slice(0, 12)}…`, 'ok');
      loadBalances(address);
    } catch (err: unknown) {
      slog(`${(err as Error).message}`, 'error');
      setSending(false);
    }
  }

  async function viewTx(ref: TxRef) {
    const token = jwtRef.current ?? (address ? await ensureAuth(address).catch(() => null) : null);
    if (!token) return;
    const tx = await API.getTransaction(ref.id, token);
    if (tx) { setTxData(tx); startPoll(ref.id); }
  }

  const buy = kind === 'deposit';

  return (
    <div className="flex min-h-screen flex-col">
      <Header address={address} connecting={connecting} onConnect={handleConnect} isMainnet={isMainnet} />

      {!address ? (
        <Hero connecting={connecting} onConnect={handleConnect} connectMsg={connectMsg} />
      ) : (
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-5 py-8 sm:px-8">
          {/* Wallet / balances */}
          <Reveal>
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-subtle">Your balance</p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-3xl font-bold tracking-tight text-ink">
                      {anch === undefined ? '…' : anch === null ? '0.00' : parseFloat(anch).toFixed(2)}
                    </span>
                    <span className="mb-1 text-sm font-medium text-muted">{ASSET}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">{xlm} XLM · for network fees</p>
                </div>
                <button onClick={() => loadBalances(address)} className="rounded-full p-2 text-subtle transition-colors hover:bg-surface hover:text-ink" title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              {(anch === null || xlm === '—' || xlm === '0.0000000') && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {!isMainnet && (
                    <Button variant="ghost" size="sm" onClick={handleFund}><Droplets className="h-3.5 w-3.5" /> Fund test XLM</Button>
                  )}
                  {anch === null && (
                    <Button variant="secondary" size="sm" onClick={handleTrustline}><Plus className="h-3.5 w-3.5" /> Enable {ASSET}</Button>
                  )}
                </div>
              )}
            </Card>
          </Reveal>

          {/* Buy / Sell */}
          <Reveal delay={0.05}>
            <Card className="p-6">
              <div className="mb-5 grid grid-cols-2 gap-1 rounded-pill bg-surface p-1">
                {([['deposit', 'Buy'], ['withdraw', 'Sell']] as const).map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => { setKind(k); setLogs([]); setJwt(null); }}
                    className={`flex items-center justify-center gap-1.5 rounded-pill py-2 text-sm font-semibold transition-all ${kind === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                  >
                    {k === 'deposit' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />} {lbl}
                  </button>
                ))}
              </div>

              <label className="text-sm font-medium text-ink">You {buy ? 'buy' : 'sell'}</label>
              <div className="mt-2 flex items-center gap-3 rounded-mock border border-line bg-white px-4 focus-within:ring-2 focus-within:ring-brand">
                <Input
                  type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="h-14 border-0 px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
                />
                <span className="shrink-0 rounded-pill bg-surface px-3 py-1.5 text-sm font-semibold text-ink">{ASSET}</span>
              </div>
              <p className="mt-2 text-xs text-subtle">
                {buy ? `Pay in ${brand.currency}, receive ${ASSET} on Stellar.` : `Send ${ASSET}, receive ${brand.currency} to your account.`}
              </p>

              <Button variant="brand" size="lg" className="mt-5 w-full" onClick={handleAction} disabled={acting}>
                {acting ? <><Loader2 className="h-5 w-5 animate-spin" /> Starting…</> : buy ? `Buy ${ASSET}` : `Sell ${ASSET}`}
              </Button>

              {logs.length > 0 && (
                <div className="mt-4 space-y-1 border-t border-line pt-3">
                  {logs.map((l, i) => (
                    <p key={i} className={`text-xs ${l.level === 'ok' ? 'text-[var(--color-up)]' : l.level === 'error' ? 'text-[var(--color-down)]' : 'text-muted'}`}>{l.msg}</p>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>

          {/* Withdrawal payment */}
          {pending && (
            <Reveal>
              <Card className="border-brand-200 bg-brand-50 p-6">
                <p className="text-sm font-semibold text-ink">Complete your sale</p>
                <p className="mt-1 text-sm text-muted">Send {ASSET} on Stellar to finish. Your wallet will confirm the exact amount and memo.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-mock border border-brand-100 bg-white p-3">
                    <p className="text-xs text-subtle">Amount</p>
                    <p className="text-lg font-bold text-ink">{pending.amount} <span className="text-sm font-normal text-muted">{ASSET}</span></p>
                  </div>
                  <div className="rounded-mock border border-brand-100 bg-white p-3">
                    <p className="text-xs text-subtle">Memo (exact)</p>
                    <p className="font-mono text-lg font-bold text-brand-700">{pending.memo}</p>
                  </div>
                </div>
                <Button variant="brand" size="lg" className="mt-4 w-full" onClick={handleSend} disabled={sending}>
                  {sending ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Sign &amp; send {ASSET}</>}
                </Button>
                {sendLogs.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {sendLogs.map((l, i) => (
                      <p key={i} className={`text-xs ${l.level === 'ok' ? 'text-[var(--color-up)]' : l.level === 'error' ? 'text-[var(--color-down)]' : 'text-muted'}`}>{l.msg}</p>
                    ))}
                  </div>
                )}
              </Card>
            </Reveal>
          )}

          {/* Live status */}
          {txData && <Reveal><TxStatusCard txData={txData} assetCode={ASSET} kind={kind} /></Reveal>}

          {/* History */}
          {history.length > 0 && (
            <Reveal delay={0.05}>
              <Card className="p-6">
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-subtle" />
                  <h3 className="text-base font-semibold text-ink">Recent activity</h3>
                </div>
                <div className="divide-y divide-line">
                  {history.map((h) => (
                    <button key={h.id} onClick={() => viewTx(h)} className="flex w-full items-center justify-between py-3 text-left transition-colors hover:opacity-70">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${h.kind === 'deposit' ? 'bg-brand-100 text-brand-800' : 'bg-surface-2 text-muted'}`}>
                          {h.kind === 'deposit' ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{h.kind === 'deposit' ? 'Buy' : 'Sell'} {h.amount} {ASSET}</p>
                          <p className="text-xs text-subtle">{new Date(h.startedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className="font-mono text-xs text-subtle">{h.id.slice(0, 6)}…</span>
                    </button>
                  ))}
                </div>
              </Card>
            </Reveal>
          )}
        </main>
      )}

      <InfoSections />
      <Footer />

      {/* SEP-24 interactive modal */}
      <AnimatePresence>
        {iframeUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-noir/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIframeUrl(null)}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-card bg-white shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <p className="text-sm font-semibold text-ink">{buy ? `Buy ${ASSET}` : `Sell ${ASSET}`}</p>
                <button onClick={() => setIframeUrl(null)} className="rounded-full p-1.5 text-subtle hover:bg-surface hover:text-ink"><X className="h-4 w-4" /></button>
              </div>
              <iframe src={iframeUrl} className="h-[460px] w-full" title="Anchor interactive form" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
