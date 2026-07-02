'use client';

import { useLive, Summary, Tx, fmtNum, shortKey } from '../lib/api';
import { RefreshDot } from '../components/bits';
import { TxTable } from '../components/TxTable';

export default function Overview() {
  const { data: s, error } = useLive<Summary>('/admin/summary', 5000);
  const { data: txd } = useLive<{ transactions: Tx[] }>('/admin/transactions', 5000);
  const txs = txd?.transactions ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Overview</h1>
          <div className="crumb">Treasury &amp; activity</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="badge net"><span className="tick" />{s?.network ?? '…'}</span>
          <RefreshDot error={error} />
        </div>
      </div>

      <div className="content grid">
        {error && <div className="errbar">Can’t reach the anchor: {error}</div>}

        <div className="hero">
          <div className="glow" />
          <div>
            <div className="label">Treasury USDC float</div>
            <div className="balance">{s ? fmtNum(s.treasury.usdc) : '—'}<span className="unit">USDC</span></div>
            <div className="sub">{s ? shortKey(s.treasury.address, 6) : '…'}</div>
          </div>
          <div className="hero-side">
            <div><div className="k">XLM</div><div className="v">{s ? fmtNum(s.treasury.xlm) : '—'}</div></div>
            <div><div className="k">FX · 1 USDC</div><div className="v">₹{s?.rate.inrPerUsdc ?? '—'}</div></div>
          </div>
        </div>

        <div className="grid tiles">
          <div className="tile">
            <div className="k">Transactions</div>
            <div className="v">{s?.counts.total ?? '—'}</div>
            <div className="s">{s?.counts.deposits ?? 0} deposits · {s?.counts.withdrawals ?? 0} withdrawals</div>
          </div>
          <div className="tile">
            <div className="k">Completed</div>
            <div className="v">{s?.counts.completed ?? '—'}</div>
            <div className="s">{s?.counts.pending ?? 0} in flight</div>
          </div>
          <div className="tile">
            <div className="k">On-ramp collected</div>
            <div className="v in">₹{s ? fmtNum(s.volume.inrCollected) : '—'}</div>
            <div className="s">{s ? fmtNum(s.volume.usdcDeposited) : '—'} USDC released</div>
          </div>
          <div className="tile">
            <div className="k">Off-ramp paid</div>
            <div className="v out">₹{s ? fmtNum(s.volume.inrPaidOut) : '—'}</div>
            <div className="s">{s ? fmtNum(s.volume.usdcWithdrawn) : '—'} USDC received</div>
          </div>
        </div>

        <div className="tablewrap">
          <div className="head">
            <h2>Recent activity</h2>
            <a className="linkish" href="/transactions">View all →</a>
          </div>
          <TxTable txs={txs.slice(0, 8)} network={s?.network} />
        </div>
      </div>
    </>
  );
}
