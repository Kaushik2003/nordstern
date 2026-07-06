'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as Freighter from '@/lib/freighter';
import * as API from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LogEntry {
  msg: string;
  level: 'info' | 'ok' | 'error';
}

interface PendingWithdrawal {
  txId: string;
  memo: string;
  amount: string;
  destination: string;
}

// ── Small UI primitives ────────────────────────────────────────────────────────

function Log({ entries }: { entries: LogEntry[] }) {
  if (!entries.length) return null;
  return (
    <div className="mt-3 space-y-0.5">
      {entries.map((e, i) => (
        <p
          key={i}
          className={`text-xs font-mono ${
            e.level === 'ok' ? 'text-emerald-600' : e.level === 'error' ? 'text-red-500' : 'text-slate-500'
          }`}
        >
          {e.msg}
        </p>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-800',
    pending_anchor: 'bg-amber-100 text-amber-800',
    pending_user_transfer_start: 'bg-blue-100 text-blue-800',
    pending_external: 'bg-violet-100 text-violet-800',
    error: 'bg-red-100 text-red-800',
    incomplete: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">{children}</p>;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Home() {
  // Wallet
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState('');
  const jwtRef = useRef<string | null>(null);
  const [jwt, _setJwt] = useState<string | null>(null);
  const setJwt = (t: string | null) => { jwtRef.current = t; _setJwt(t); };

  const [assetCode, setAssetCode] = useState('USDC');

  useEffect(() => {
    fetch('/biz/health')
      .then((r) => r.json())
      .then((d) => {
        if (d.asset) setAssetCode(d.asset.toUpperCase());
      })
      .catch((e) => console.error('Failed to fetch asset code:', e));
  }, []);

  // Balances
  const [xlm, setXlm] = useState('—');
  const [anch, setAnch] = useState<string | null | undefined>(undefined);

  // Flow
  const [kind, setKind] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('10');
  const [acting, setActing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // SEP-24 iframe
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  // Withdrawal payment
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const pendingRef = useRef<PendingWithdrawal | null>(null);
  pendingRef.current = pending;
  const [sending, setSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<LogEntry[]>([]);

  // Transaction status
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [txData, setTxData] = useState<Record<string, unknown> | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const addLog = (set: React.Dispatch<React.SetStateAction<LogEntry[]>>, msg: string, level: LogEntry['level'] = 'info') =>
    set(prev => [...prev, { msg, level }]);

  const log = (msg: string, level: LogEntry['level'] = 'info') =>
    addLog(setLogs, msg, level);

  const loadBalances = useCallback(async (addr: string) => {
    setXlm('…'); setAnch(undefined);
    const d = await API.getAccount(addr);
    setXlm(d.xlm ? parseFloat(d.xlm).toFixed(2) : '—');
    setAnch(d.anch);
  }, []);

  const activate = useCallback((addr: string) => {
    setAddress(addr);
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

  // ── Auto-reconnect on mount ───────────────────────────────────────────────────

  useEffect(() => {
    Freighter.checkConnected().then(addr => {
      if (addr) activate(addr);
    });
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [activate]);

  // ── postMessage from the SEP-24 iframe ───────────────────────────────────────

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const { type, txId, hash, memo, amount, destination } = (e.data ?? {}) as Record<string, string>;

      if (type === 'sep24_deposit_complete') {
        setIframeUrl(null);
        addLog(setLogs, `✓ Deposit done${hash ? ` — ${hash.slice(0, 14)}…` : ''}`, 'ok');
        if (txId) startPoll(txId);
      }

      if (type === 'sep24_withdrawal_pending') {
        setIframeUrl(null);
        const p = { txId, memo, amount, destination };
        setPending(p);
        pendingRef.current = p;
        if (txId) startPoll(txId);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [startPoll]);

  // ── SEP-10 auth ───────────────────────────────────────────────────────────────

  async function ensureAuth(addr: string): Promise<string> {
    if (jwtRef.current) return jwtRef.current;
    log('Getting SEP-10 challenge…');
    const xdr = await API.sep10Challenge(addr);
    log('Waiting for Freighter to sign SEP-10 challenge…');
    const signed = await Freighter.signTransaction(xdr);
    log('Submitting auth…');
    const token = await API.sep10Submit(signed);
    setJwt(token);
    log('✓ Authenticated', 'ok');
    return token;
  }

  // ── Connect Freighter ─────────────────────────────────────────────────────────

  async function handleConnect() {
    setConnecting(true);
    setConnectMsg('⏳ Check Freighter — click the 🚀 icon in your toolbar to approve');
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

  // ── Wallet actions ────────────────────────────────────────────────────────────

  async function handleFund() {
    if (!address) return;
    try {
      await API.friendbot(address);
      setTimeout(() => loadBalances(address!), 5000);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  async function handleTrustline() {
    if (!address) return;
    try {
      const xdr = await API.buildTrustlineXdr(address);
      const signed = await Freighter.signTransaction(xdr);
      await API.submitXdr(signed);
      setTimeout(() => loadBalances(address!), 3000);
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  }

  // ── SEP-24 deposit / withdraw ─────────────────────────────────────────────────

  async function handleAction() {
    if (!address) return;
    setLogs([]);
    setIframeUrl(null);
    setPending(null);
    setTxData(null);
    setActing(true);
    try {
      const token = await ensureAuth(address);
      log(`Initiating ${kind} of ${amount} ${assetCode}…`);
      const { id, url } = await API.initiateSep24(kind, amount, token, assetCode);
      log(`✓ Transaction ID: ${id}`, 'ok');
      log('Open the anchor form in the panel below…', 'info');
      setIframeUrl(url);
      startPoll(id);
    } catch (err: unknown) {
      log(`✗ ${(err as Error).message}`, 'error');
    } finally {
      setActing(false);
    }
  }

  // ── Send ANCH (withdrawal payment) ───────────────────────────────────────────

  async function handleSend() {
    const p = pendingRef.current;
    if (!p || !address) return;
    setSendLogs([]);
    setSending(true);
    const slog = (msg: string, level: LogEntry['level'] = 'info') =>
      addLog(setSendLogs, msg, level);
    try {
      slog('Building payment transaction…');
      const xdr = await API.buildPaymentXdr(address, p.destination, p.amount, p.memo);
      slog('Waiting for Freighter to sign…');
      const signed = await Freighter.signTransaction(xdr);
      slog('Submitting to Stellar…');
      const hash = await API.submitXdr(signed);
      slog(`✓ Sent — hash: ${hash}`, 'ok');
      slog('Anchor will confirm shortly…', 'info');
      loadBalances(address);
    } catch (err: unknown) {
      slog(`✗ ${(err as Error).message}`, 'error');
      setSending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 h-14 flex items-center px-5 gap-3">
        <span className="text-white font-bold text-sm">{assetCode}</span>
        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300">TESTNET</span>
        <span className="flex-1" />
        {!address ? (
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {connecting ? 'Connecting…' : '🚀 Connect Freighter'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 text-xs font-mono">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-7 space-y-4">

        {/* ── Landing ── */}
        {!address && (
          <div className="text-center py-16 px-4">
            <div className="text-5xl mb-4">🌟</div>
            <h1 className="text-2xl font-bold mb-2">{assetCode} Anchor</h1>
            <p className="text-slate-500 mb-8">
              Deposit and withdraw {assetCode} tokens via SEP-10 + SEP-24
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-base"
            >
              {connecting ? '⏳ Connecting…' : '🚀 Connect Freighter'}
            </button>
            {connectMsg && (
              <p className={`mt-4 text-sm ${connectMsg.startsWith('❌') ? 'text-red-500' : 'text-slate-500'}`}>
                {connectMsg}
              </p>
            )}
            <p className="mt-4 text-xs text-slate-400">
              Need Freighter?{' '}
              <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                freighter.app →
              </a>
              {' · '}Make sure it&apos;s set to <strong>Testnet</strong>
            </p>
          </div>
        )}

        {/* ── App ── */}
        {address && (
          <>
            {/* Wallet card */}
            <Card>
              <SectionLabel>Wallet</SectionLabel>
              <p className="text-xs font-mono text-slate-400 break-all mb-4">{address}</p>

              <div className="flex gap-6 mb-4">
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">XLM</p>
                  <p className="text-2xl font-bold tracking-tight">{xlm}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-0.5">{assetCode}</p>
                  {anch === undefined ? (
                    <p className="text-2xl font-bold tracking-tight text-slate-300">…</p>
                  ) : anch === null ? (
                    <p className="text-sm font-semibold text-amber-500 mt-1">no trustline</p>
                  ) : (
                    <p className="text-2xl font-bold tracking-tight">{parseFloat(anch).toFixed(2)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => loadBalances(address)}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={handleFund}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  🪣 Friendbot (fund XLM)
                </button>
                {anch === null && (
                  <button
                    onClick={handleTrustline}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    + Create {assetCode} trustline
                  </button>
                )}
              </div>
            </Card>

            {/* Action card */}
            <Card>
              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
                {(['deposit', 'withdraw'] as const).map(k => (
                  <button
                    key={k}
                    onClick={() => { setKind(k); setLogs([]); setJwt(null); }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      kind === k
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {k === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 focus-within:border-indigo-400 transition-colors">
                <span className="text-sm text-slate-400">{assetCode}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  min={1}
                  className="flex-1 bg-transparent text-right text-xl font-bold text-slate-900 outline-none min-w-0"
                />
              </div>

              <button
                onClick={handleAction}
                disabled={acting}
                className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-50 ${
                  kind === 'deposit'
                    ? 'bg-indigo-500 hover:bg-indigo-600'
                    : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                {acting ? 'Working…' : kind === 'deposit' ? `Deposit ${assetCode}` : `Withdraw ${assetCode}`}
              </button>

              <Log entries={logs} />
            </Card>

            {/* SEP-24 iframe */}
            {iframeUrl && (
              <Card>
                <SectionLabel>Anchor form</SectionLabel>
                <iframe
                  src={iframeUrl}
                  className="w-full h-[440px] rounded-xl border border-slate-200"
                  title="Anchor interactive form"
                />
              </Card>
            )}

            {/* Withdrawal payment card */}
            {pending && (
              <Card className="border-violet-200 bg-violet-50">
                <SectionLabel>Send {assetCode} on Stellar</SectionLabel>
                <p className="text-sm text-slate-600 mb-3">
                  Sign and submit the on-chain payment to complete your withdrawal.
                </p>

                <div className="space-y-2 mb-4">
                  <div className="bg-white rounded-xl p-3 border border-violet-100">
                    <p className="text-[10px] text-slate-400 mb-1">To (Distribution account)</p>
                    <p className="text-xs font-mono text-slate-600 break-all">{pending.destination}</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white rounded-xl p-3 border border-violet-100">
                      <p className="text-[10px] text-slate-400 mb-1">Amount</p>
                      <p className="text-lg font-bold">{pending.amount} <span className="text-sm font-normal text-slate-400">{assetCode}</span></p>
                    </div>
                    <div className="flex-1 bg-white rounded-xl p-3 border border-violet-100">
                      <p className="text-[10px] text-slate-400 mb-1">Memo (exact)</p>
                      <p className="text-lg font-bold font-mono text-violet-700">{pending.memo}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  {sending ? 'Sending…' : `✈ Sign & Send ${assetCode}`}
                </button>

                <Log entries={sendLogs} />
              </Card>
            )}

            {/* Transaction status card */}
            {txData && (
              <Card>
                <SectionLabel>Transaction</SectionLabel>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">ID</p>
                    <p className="text-xs font-mono text-slate-500 break-all">{String(txData.id ?? '—')}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Status</p>
                      <StatusPill status={String(txData.status ?? '—')} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1">Kind</p>
                      <StatusPill status={String(txData.kind ?? kind)} />
                    </div>
                    {txData.amount_in != null && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Amount in</p>
                        <p className="text-sm font-semibold">
                          {parseFloat(String((txData.amount_in as Record<string, string>).amount ?? '0')).toFixed(2)} {assetCode}
                        </p>
                      </div>
                    )}
                    {txData.amount_out != null && (
                      <div>
                        <p className="text-[10px] text-slate-400 mb-1">Amount out</p>
                        <p className="text-sm font-semibold">
                          {parseFloat(String((txData.amount_out as Record<string, string>).amount ?? '0')).toFixed(2)} {assetCode}
                        </p>
                      </div>
                    )}
                  </div>

                  {Array.isArray(txData.stellar_transactions) && txData.stellar_transactions.length > 0 && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${String((txData.stellar_transactions as Record<string, string>[])[0].id)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs text-indigo-500 hover:underline"
                    >
                      View on Stellar Expert →
                    </a>
                  )}

                  {txData.message != null && (
                    <p className="text-xs text-red-500">{String(txData.message)}</p>
                  )}

                  {txData.status !== 'completed' && txData.status !== 'error' && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Polling for updates…
                    </p>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
