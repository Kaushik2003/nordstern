'use client';

import { Tx, fmtAsset, shortKey, timeAgo } from '../lib/api';
import { StatusBadge, Direction } from './bits';

export function TxTable({ txs, network }: { txs: Tx[]; network?: string }) {
  if (!txs.length) {
    return <div className="empty">No transactions yet — run a deposit or withdrawal and it shows up here.</div>;
  }
  const net = network === 'mainnet' ? 'public' : 'testnet';
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Type</th><th>Status</th><th>User pays</th><th>User gets</th>
            <th>Memo</th><th>Stellar tx</th><th>When</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id}>
              <td><Direction kind={t.kind} /></td>
              <td><StatusBadge status={t.status} /></td>
              <td className="amt">{fmtAsset(t.amountIn)}</td>
              <td className="amt">{fmtAsset(t.amountOut ?? t.amountExpected)}</td>
              <td className="mono">{t.memo ?? '—'}</td>
              <td>
                {t.stellarTx
                  ? <a className="linkish" target="_blank" rel="noreferrer"
                       href={`https://stellar.expert/explorer/${net}/tx/${t.stellarTx}`}>{shortKey(t.stellarTx)}</a>
                  : <span className="muted">—</span>}
              </td>
              <td className="muted">{timeAgo(t.startedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
