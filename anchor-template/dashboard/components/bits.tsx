'use client';

// Status → badge style. Emerald = terminal-good, amber = in-flight, red = failed.
export function StatusBadge({ status }: { status: string }) {
  const s = status ?? '';
  let cls = 'dim', label = s.replace(/_/g, ' ');
  if (s === 'completed') { cls = 'ok'; label = 'completed'; }
  else if (s === 'error') { cls = 'err'; label = 'error'; }
  else if (s === 'refunded') { cls = 'dim'; }
  else if (s.startsWith('pending') || s === 'incomplete') { cls = 'pending'; }
  return <span className={`badge ${cls}`}><span className="tick" />{label}</span>;
}

// Deposit = money in (emerald), withdrawal = money out (coral).
export function Direction({ kind }: { kind: string }) {
  const isIn = kind === 'deposit';
  return (
    <span className={`dir ${isIn ? 'in' : 'out'}`}>
      <span className="arrow">{isIn ? '↓' : '↑'}</span>
      {isIn ? 'Deposit' : 'Withdraw'}
    </span>
  );
}

export function RefreshDot({ error }: { error: string | null }) {
  return (
    <span className="refresh">
      {error ? <span className="tick" style={{ background: 'var(--red)' }} /> : <span className="pulse" />}
      {error ? 'reconnecting…' : 'live'}
    </span>
  );
}
