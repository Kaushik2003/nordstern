'use client';

import { useEffect, useState } from 'react';

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

  const statusColor: Record<string, string> = {
    completed: 'text-green-400 bg-green-400/10',
    pending:   'text-yellow-400 bg-yellow-400/10',
    failed:    'text-red-400 bg-red-400/10',
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          {(['all', 'deposit', 'withdrawal'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-sm px-4 py-2 rounded-lg transition-colors capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs text-left">
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
                className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors">
                <td className="px-5 py-4">
                  <span className={`text-sm ${tx.type === 'deposit' ? 'text-blue-400' : 'text-purple-400'}`}>
                    {tx.type === 'deposit' ? '↓' : '↑'} {tx.type}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-white">{tx.amount} ANCH</td>
                <td className="px-5 py-4 font-mono text-xs text-slate-400">{tx.wallet}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColor[tx.status]}`}>{tx.status}</span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-400">{tx.elapsed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-6">
              <div>
                <div className="text-slate-400 text-xs mb-1 capitalize">{selected.type} #{selected.id}</div>
                <div className="text-2xl font-bold">{selected.amount} ANCH</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full h-fit ${statusColor[selected.status]}`}>{selected.status}</span>
            </div>

            <div className="space-y-4">
              <Row label="User Wallet" value={selected.wallet} mono />
              <Row label="Time" value={selected.elapsed} />
              {selected.hash && (
                <div>
                  <div className="text-xs text-slate-400 mb-1">Stellar Transaction</div>
                  <a href={`https://stellar.expert/explorer/testnet/tx/${selected.hash}`}
                     target="_blank" rel="noopener noreferrer"
                     className="font-mono text-xs text-blue-400 hover:underline">
                    {selected.hash} ↗
                  </a>
                </div>
              )}
              <Row label="Fiat Event" value={selected.status === 'completed' ? `$${selected.amount} debited from fiat reserve` : '—'} />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-500 mb-3">Status timeline</div>
              {['incomplete', 'pending_user_transfer_start', 'pending_external', 'completed'].map((s, i) => (
                <div key={s} className={`flex items-center gap-2 text-xs mb-1.5 ${selected.status === 'failed' && i === 3 ? 'opacity-30' : ''}`}>
                  <span className={i <= 3 && selected.status !== 'failed' ? 'text-green-400' : i === 3 && selected.status === 'failed' ? 'text-red-400' : 'text-slate-600'}>
                    {i < 4 || selected.status === 'completed' ? '✓' : '—'}
                  </span>
                  <span className="text-slate-300">{s}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setSelected(null)} className="w-full mt-6 border border-slate-700 hover:border-slate-600 text-slate-400 py-2 rounded-lg text-sm transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
