'use client';

import { useEffect, useState } from 'react';
import { Card, Badge, Button } from '@/components/ui';

// Mock transactions for demo — in production these come from the anchor-platform DB
const MOCK_TXS = [
  { id: 'a3f8c2d1', type: 'deposit',    amount: '100', status: 'completed', wallet: 'GBTK...X4QA', elapsed: '2m ago',  hash: 'abc123' },
  { id: 'b9e1f4a2', type: 'withdrawal', amount: '50',  status: 'completed', wallet: 'GCDE...P9QB', elapsed: '15m ago', hash: 'def456' },
  { id: 'c2a7d3b8', type: 'deposit',    amount: '25',  status: 'pending',   wallet: 'GHIJ...K1RC', elapsed: '1m ago',  hash: null },
  { id: 'd5b6e9f1', type: 'withdrawal', amount: '200', status: 'completed', wallet: 'GLMN...Q5SD', elapsed: '42m ago', hash: 'ghi789' },
  { id: 'e8c4f2a7', type: 'deposit',    amount: '500', status: 'completed', wallet: 'GPQR...T3UE', elapsed: '1h ago',  hash: 'jkl012' },
  { id: 'f1d9g3b5', type: 'withdrawal', amount: '75',  status: 'failed',    wallet: 'GUVW...X8VF', elapsed: '2h ago',  hash: null },
];

type Filter = 'all' | 'deposit' | 'withdrawal';

export default function TransactionsPage() {
  const [filter, setFilter]     = useState<Filter>('all');
  const [selected, setSelected] = useState<typeof MOCK_TXS[0] | null>(null);

  const txs = filter === 'all' ? MOCK_TXS : MOCK_TXS.filter(t => t.type === filter);

  const statusTone: Record<string, 'success' | 'warning' | 'danger'> = {
    completed: 'success',
    pending:   'warning',
    failed:    'danger',
  };

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          {(['all', 'deposit', 'withdrawal'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm capitalize transition-colors ${filter === f ? 'bg-brand/15 text-brand ring-1 ring-inset ring-brand/30' : 'text-muted hover:bg-surface-2 hover:text-ink'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Wallet</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id} onClick={() => setSelected(tx)}
                className="cursor-pointer border-b border-line/50 transition-colors hover:bg-surface-2/50">
                <td className="px-5 py-4">
                  <span className={`text-sm ${tx.type === 'deposit' ? 'text-brand' : 'text-[#8B7EE0]'}`}>
                    {tx.type === 'deposit' ? '↓' : '↑'} {tx.type}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-ink">{tx.amount} ANCH</td>
                <td className="px-5 py-4 font-mono text-xs text-muted">{tx.wallet}</td>
                <td className="px-5 py-4">
                  <Badge tone={statusTone[tx.status]}>{tx.status}</Badge>
                </td>
                <td className="px-5 py-4 text-sm text-muted">{tx.elapsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0C0A12]/80 p-4" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-md p-8" onClick={(e: any) => e.stopPropagation()}>
            <div className="mb-6 flex justify-between">
              <div>
                <div className="mb-1 text-xs capitalize text-muted">{selected.type} #{selected.id}</div>
                <div className="text-2xl font-bold">{selected.amount} ANCH</div>
              </div>
              <div className="h-fit"><Badge tone={statusTone[selected.status]}>{selected.status}</Badge></div>
            </div>

            <div className="space-y-4">
              <Row label="User Wallet" value={selected.wallet} mono />
              <Row label="Time" value={selected.elapsed} />
              {selected.hash && (
                <div>
                  <div className="mb-1 text-xs text-muted">Stellar Transaction</div>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${selected.hash}`}
                     target="_blank" rel="noopener noreferrer"
                     className="font-mono text-xs text-brand hover:underline">
                    {selected.hash} ↗
                  </a>
                </div>
              )}
              <Row label="Fiat Event" value={selected.status === 'completed' ? `$${selected.amount} debited from fiat reserve` : '—'} />
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <div className="mb-3 text-xs text-faint">Status timeline</div>
              {['incomplete', 'pending_user_transfer_start', 'pending_external', 'completed'].map((s, i) => (
                <div key={s} className={`mb-1.5 flex items-center gap-2 text-xs ${selected.status === 'failed' && i === 3 ? 'opacity-30' : ''}`}>
                  <span className={i <= 3 && selected.status !== 'failed' ? 'text-success' : i === 3 && selected.status === 'failed' ? 'text-danger' : 'text-faint'}>
                    {i < 4 || selected.status === 'completed' ? '✓' : '—'}
                  </span>
                  <span className="text-muted">{s}</span>
                </div>
              ))}
            </div>

            <Button variant="outline" className="mt-6 w-full" onClick={() => setSelected(null)}>
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted">{label}</div>
      <div className={`text-sm text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
