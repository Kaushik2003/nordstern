'use client';

import { useState } from 'react';
import { useLive, Summary, Tx } from '../../lib/api';
import { RefreshDot } from '../../components/bits';
import { TxTable } from '../../components/TxTable';

type Filter = 'all' | 'deposit' | 'withdrawal';
const labels: Record<Filter, string> = { all: 'All', deposit: 'Deposits', withdrawal: 'Withdrawals' };

export default function Transactions() {
  const { data, error } = useLive<{ transactions: Tx[] }>('/admin/transactions', 5000);
  const { data: s } = useLive<Summary>('/admin/summary', 10000);
  const [filter, setFilter] = useState<Filter>('all');

  const all = data?.transactions ?? [];
  const txs = filter === 'all' ? all : all.filter((t) => t.kind === filter);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Transactions</h1>
          <div className="crumb">{all.length} total · live SEP-24 ledger</div>
        </div>
        <RefreshDot error={error} />
      </div>

      <div className="content grid">
        {error && <div className="errbar">Can’t reach the anchor: {error}</div>}
        <div className="tablewrap">
          <div className="head">
            <div className="filters">
              {(Object.keys(labels) as Filter[]).map((f) => (
                <button key={f} className={`chip ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                  {labels[f]}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{txs.length} shown</span>
          </div>
          <TxTable txs={txs} network={s?.network} />
        </div>
      </div>
    </>
  );
}
