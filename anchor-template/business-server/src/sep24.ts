import { Router } from 'express';
import { ASSET_CODE, IS_MAINNET, TREASURY_PUBLIC, assetId } from './config.js';
import { fetchTransaction, patchTransaction } from './platform.js';
import { generateMemo, sendUsdc, assertTreasuryReserve, hasUsdcTrustline } from './stellar.js';
import { rate, deposit } from './adapters/index.js';
import { getStatus, createSession } from './adapters/kyc/didit.js';

// ─── SEP-24 interactive ────────────────────────────────────────────────────────
// The Anchor Platform opens this URL in the wallet's webview.
//   Deposit  (on-ramp):  show INR-to-pay (FX) + fiat-in instructions → confirm →
//                        reserve-check → transfer real USDC treasury→user → complete.
//   Withdraw (off-ramp): show treasury address + memo → confirm → status
//                        pending_user_transfer_start (Observer detection = Phase C).
//
// Money-affecting values (amount, destination) are read server-side from the
// Platform API, never trusted from the client form.

export const sep24Router = Router();

const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 1rem; color: #111; }
  h2 { font-size: 1.4rem; margin-bottom: .25rem; }
  .sub { font-size: .8rem; color: #666; margin-bottom: 1.25rem; }
  .card { background: #f6f6f8; border: 1px solid #e5e5ea; border-radius: 8px; padding: .9rem 1rem; margin: .6rem 0; }
  .label { font-size: .72rem; color: #888; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 3px; }
  .value { font-family: monospace; font-size: .9rem; word-break: break-all; }
  .big { font-size: 1.6rem; font-weight: 700; }
  .note { font-size: .8rem; color: #666; margin: .75rem 0; line-height: 1.5; }
  .badge { display:inline-block; background:#ede9fe; color:#6d28d9; font-size:.7rem; padding:2px 7px; border-radius:5px; margin-left:6px; }
  .ok { color:#16a34a; font-size:1.5rem; font-weight:700; margin-bottom:.5rem; }
  .err { color:#dc2626; }
  button { display:block; width:100%; padding:.85rem; background:#6d28d9; color:#fff; font-size:1rem; border:none; border-radius:8px; cursor:pointer; margin-top:.75rem; }
  button:hover { opacity:.92; }
  a { color:#6d28d9; font-size:.85rem; }
</style></head><body>${body}</body></html>`;

// ── KYC identity (the DIDIT vendor id) ──────────────────────────────────────────
// The stable per-user identity we key KYC on is the SEP-10 authenticated account.
// In this AP version that surfaces as `creator.account` (verified against a live
// transaction — there is no `sep10_account` field), with sensible fallbacks.
function resolveAccount(tx: Record<string, any>): string {
  return tx.creator?.account
    ?? tx.customers?.sender?.account
    ?? tx.destination_account
    ?? '';
}

// Client-side KYC flow: create session on click → embed the DIDIT iframe → poll our
// status endpoint (the webhook is the source of truth) → reload when verified. No
// backticks so it embeds cleanly in the page template literal.
const kycClientScript = (txId: string) => `
(function(){
  var txId = ${JSON.stringify(txId)};
  var btn = document.getElementById('verifyBtn');
  var consent = document.getElementById('consent');
  var frameWrap = document.getElementById('frameWrap');
  var statusEl = document.getElementById('kycStatus');
  var poll = null;
  function setStatus(m){ statusEl.textContent = m; }
  btn.addEventListener('click', function(){
    btn.disabled = true; setStatus('Starting secure verification…');
    fetch('/sep24/kyc/session?transaction_id=' + encodeURIComponent(txId), { method:'POST' })
      .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; }); })
      .then(function(res){
        if(!res.ok || !res.j.url){
          setStatus(res.j.error || 'Could not start verification. Please try again.');
          btn.disabled = false; return;
        }
        consent.style.display = 'none';
        var f = document.createElement('iframe');
        f.src = res.j.url;
        f.setAttribute('allow','camera; microphone; fullscreen; autoplay; encrypted-media');
        f.style.width = '100%'; f.style.height = '70vh'; f.style.border = '0'; f.style.borderRadius = '8px';
        frameWrap.appendChild(f);
        // Fallback: some browsers block the camera inside a cross-origin iframe.
        // Offer a top-level tab (camera + framing always work there); the poll below
        // still flips the gate open once the webhook lands, regardless of where the
        // user completes the flow.
        var a = document.createElement('a');
        a.href = res.j.url; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'Camera not working here? Open verification in a new tab ↗';
        a.className = 'note';
        a.style.display = 'inline-block'; a.style.marginTop = '.5rem';
        frameWrap.appendChild(a);
        setStatus('Complete the steps above to verify your identity.');
        poll = setInterval(check, 3000);
      })
      .catch(function(){ setStatus('Network error. Please try again.'); btn.disabled = false; });
  });
  function check(){
    fetch('/sep24/kyc/status?transaction_id=' + encodeURIComponent(txId))
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j.status === 'ACCEPTED'){ clearInterval(poll); setStatus('✓ Verified — loading…'); setTimeout(function(){ location.reload(); }, 800); }
        else if(j.status === 'REJECTED'){ clearInterval(poll); setStatus('Verification was declined. Reload the page to try again.'); }
        else { setStatus('Verification in progress…'); }
      })
      .catch(function(){});
  }
})();`;

function kycGatePage(transactionId: string, kind: string): string {
  const action = kind === 'withdrawal' ? 'withdraw' : 'deposit';
  const net = IS_MAINNET ? 'MAINNET' : 'TESTNET';
  return page('Verify your identity', `
    <h2>Verify your identity <span class="badge">${net}</span></h2>
    <p class="sub">Transaction <code>${transactionId}</code></p>
    <div id="consent">
      <div class="card">
        <div class="label">One-time identity check</div>
        <p class="note">Before you can ${action}, we need to verify your identity. This opens a secure
          flow (powered by DIDIT): you'll photograph your ID and take a quick selfie. Your camera is
          used only for this verification, and we store only the result — not your documents.</p>
      </div>
      <button id="verifyBtn" type="button">Verify my identity</button>
    </div>
    <div id="frameWrap" style="margin-top:.5rem"></div>
    <p class="note" id="kycStatus"></p>
    <script>${kycClientScript(transactionId)}</script>`);
}

// ── GET interactive: render the deposit / withdraw screen ───────────────────────
sep24Router.get('/interactive', async (req, res) => {
  const { transaction_id } = req.query as Record<string, string>;
  if (!transaction_id) { res.status(400).send('<h3>Missing transaction_id</h3>'); return; }

  let tx: Record<string, any>;
  try { tx = await fetchTransaction(transaction_id); }
  catch (err) { res.status(500).send(`<h3>Platform API error</h3><pre>${err}</pre>`); return; }

  const kind = tx.kind ?? 'deposit';

  // ── KYC gate ──────────────────────────────────────────────────────────────
  // No money screen until identity is verified. A returning, still-valid account
  // is ACCEPTED and skips straight through; anyone else gets the DIDIT flow.
  // Fail CLOSED: if the status can't be read, show the gate (never the money screen).
  const account = resolveAccount(tx);
  const kycStatus = await getStatus(account).catch(() => 'NEEDS_INFO');
  if (kycStatus !== 'ACCEPTED') {
    res.type('html').send(kycGatePage(transaction_id, kind));
    return;
  }

  const rawAmount = tx.amount_expected?.amount;
  const usdcAmount = (rawAmount && rawAmount !== '0') ? rawAmount : '10.00';
  const memo = generateMemo(transaction_id);
  const net = IS_MAINNET ? 'MAINNET' : 'TESTNET';

  if (kind === 'withdrawal') {
    res.type('html').send(page(`Withdraw ${ASSET_CODE}`, `
      <h2>Withdraw ${ASSET_CODE} <span class="badge">${net}</span></h2>
      <p class="sub">Transaction <code>${transaction_id}</code></p>
      <div class="card"><div class="label">Amount</div><div class="value big">${usdcAmount} ${ASSET_CODE}</div></div>
      <div class="card"><div class="label">Send your ${ASSET_CODE} to</div><div class="value">${TREASURY_PUBLIC}</div></div>
      <div class="card"><div class="label">Memo (text) — required</div><div class="value">${memo}</div></div>
      <p class="note">Send exactly ${usdcAmount} ${ASSET_CODE} with the memo above, then confirm.
        The anchor detects the transfer and pays out INR (payout is simulated in Phase C).</p>
      <form method="POST" action="/sep24/interactive/complete">
        <input type="hidden" name="transaction_id" value="${transaction_id}" />
        <button type="submit">I have sent ${usdcAmount} ${ASSET_CODE}</button>
      </form>`));
    return;
  }

  // Deposit — compute INR to pay from the FX rate, show fiat-in instructions.
  const q = await rate.quote();
  const inrAmount = (Number(usdcAmount) * Number(q.inrPerUsdc)).toFixed(2);
  const instr = await deposit.instructions({ transactionId: transaction_id, inrAmount, usdcAmount, memo });

  res.type('html').send(page(`Deposit ${ASSET_CODE}`, `
    <h2>Deposit ${ASSET_CODE} <span class="badge">${net}</span></h2>
    <p class="sub">Transaction <code>${transaction_id}</code></p>
    <div class="card"><div class="label">You receive</div><div class="value big">${usdcAmount} ${ASSET_CODE}</div></div>
    <div class="card"><div class="label">You pay (rate 1 USDC = ₹${q.inrPerUsdc}, ${q.source})</div><div class="value big">₹${inrAmount}</div></div>
    <div class="card"><div class="label">${instr.label}</div><div class="value">${instr.lines.join('<br>')}</div></div>
    ${instr.qrDataUri ? `<div style="text-align:center; margin: 1rem 0;"><img src="${instr.qrDataUri}" alt="Scan to pay" style="border-radius:8px; border:1px solid #e5e5ea;" /></div>` : ''}
    <p class="note">${instr.note}</p>
    <form method="POST" action="/sep24/interactive/complete">
      <input type="hidden" name="transaction_id" value="${transaction_id}" />
      <button type="submit">Confirm — release ${usdcAmount} ${ASSET_CODE} to my wallet</button>
    </form>`));
});

// ── POST complete: perform the money movement ───────────────────────────────────
sep24Router.post('/interactive/complete', async (req, res) => {
  const { transaction_id } = req.body as Record<string, string>;
  if (!transaction_id) { res.status(400).send('Missing transaction_id'); return; }

  let tx: Record<string, any>;
  try { tx = await fetchTransaction(transaction_id); }
  catch (err) { res.status(500).send(`<h3>Platform API error</h3><pre>${err}</pre>`); return; }

  // ── KYC enforcement (money-affecting precondition) ──────────────────────────
  // The GET /interactive gate only controls DISPLAY. Money actually moves here, so
  // KYC must be enforced SERVER-SIDE — otherwise this endpoint can be POSTed
  // directly to bypass the iframe. Same principle as the amount/destination:
  // never trust the client form. Covers deposit (USDC release) and withdrawal
  // (the pending_user_transfer_start transition the poller later acts on).
  const account = resolveAccount(tx);
  if ((await getStatus(account).catch(() => 'NEEDS_INFO')) !== 'ACCEPTED') {
    res.status(403).type('html').send(page('Verification required',
      `<h3 class="err">Identity verification required</h3>
       <p class="note">Complete identity verification before this transaction can proceed.</p>`));
    return;
  }

  const kind = tx.kind ?? 'deposit';
  const rawAmount = tx.amount_expected?.amount;
  const usdcAmount = (rawAmount && rawAmount !== '0') ? rawAmount : '10.00';
  const memo = generateMemo(transaction_id);

  try {
    // ── Withdrawal: record the expected transfer; detection/payout is Phase C ──
    if (kind === 'withdrawal') {
      await patchTransaction(transaction_id, {
        status: 'pending_user_transfer_start', memo, memo_type: 'text',
      });
      res.type('html').send(page('Waiting for transfer', `
        <div class="ok">⏳ Waiting for your ${ASSET_CODE}</div>
        <div class="card"><div class="label">Send to</div><div class="value">${TREASURY_PUBLIC}</div></div>
        <div class="card"><div class="label">Amount</div><div class="value">${usdcAmount} ${ASSET_CODE}</div></div>
        <div class="card"><div class="label">Memo (text)</div><div class="value">${memo}</div></div>
        <p class="note">Once received, the anchor releases INR (Phase C). You can close this page.</p>
        <script>try{window.parent.postMessage({type:'sep24_withdrawal_pending',txId:'${transaction_id}',memo:'${memo}'},'*')}catch(e){}</script>`));
      return;
    }

    // ── Deposit on-ramp ──────────────────────────────────────────────────────
    // Idempotency / money-safety: never re-send USDC.
    //   completed                → already done, show success.
    //   pending_anchor | error   → a prior attempt passed the pre-transfer
    //                              checkpoint and may have ALREADY released USDC.
    //                              Do not auto-resend; surface for reconciliation.
    if (tx.status === 'completed') {
      res.type('html').send(page('Deposit complete', `<div class="ok">✓ Already completed</div>`));
      return;
    }
    if (tx.status === 'pending_anchor' || tx.status === 'error') {
      throw new Error(
        `transaction is in state '${tx.status}' — a prior attempt may have released USDC. ` +
        `Refusing to auto-resend; manual reconciliation required.`,
      );
    }

    const destination = tx.destination_account;
    if (!destination) throw new Error('no destination_account on transaction');
    if (!(await hasUsdcTrustline(destination))) {
      throw new Error(`destination ${destination} has no ${ASSET_CODE} trustline — add it in your wallet, then retry`);
    }

    const q = await rate.quote();
    const inrAmount = (Number(usdcAmount) * Number(q.inrPerUsdc)).toFixed(2);

    // Reserve guardrail before we move money.
    await assertTreasuryReserve(usdcAmount);

    await patchTransaction(transaction_id, { status: 'pending_anchor' });
    const hash = await sendUsdc(destination, usdcAmount);
    await patchTransaction(transaction_id, {
      status: 'completed',
      amount_in:  { amount: inrAmount,   asset: 'iso4217:INR' },
      amount_out: { amount: usdcAmount,  asset: assetId() },
      amount_fee: { amount: '0',         asset: assetId() },
      stellar_transactions: [{ id: hash }],
    });

    res.type('html').send(page('Deposit complete', `
      <div class="ok">✓ Deposit complete</div>
      <p>${usdcAmount} ${ASSET_CODE} sent to your wallet for ₹${inrAmount} (1 USDC = ₹${q.inrPerUsdc}).</p>
      <p style="margin-top:1rem"><a href="https://stellar.expert/explorer/${IS_MAINNET ? 'public' : 'testnet'}/tx/${hash}" target="_blank">View on Stellar Expert →</a></p>
      <script>try{window.parent.postMessage({type:'sep24_deposit_complete',txId:'${transaction_id}',hash:'${hash}'},'*')}catch(e){}</script>`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[complete] error:', msg);
    // Reflect the failure in Platform state so the tx isn't stuck mid-flight.
    await patchTransaction(transaction_id, { status: 'error', message: msg }).catch(() => {});
    res.status(500).type('html').send(page('Error', `<h3 class="err">Error</h3><pre>${msg}</pre>`));
  }
});

// ── KYC session: create (or reuse) a DIDIT session for this tx's account ─────────
sep24Router.post('/kyc/session', async (req, res) => {
  const transaction_id = (req.query.transaction_id ?? req.body?.transaction_id) as string | undefined;
  if (!transaction_id) { res.status(400).json({ error: 'Missing transaction_id' }); return; }
  try {
    const tx = await fetchTransaction(transaction_id);
    const account = resolveAccount(tx);
    if (!account) { res.status(400).json({ error: 'No account on transaction' }); return; }
    const session = await createSession(account, transaction_id);
    res.json({ url: session.url, session_token: session.sessionToken, status: session.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[kyc/session] error:', msg);
    const friendly = /enough credits|top ?up/i.test(msg)
      ? 'Identity verification is temporarily unavailable (provider not funded). Please try again later.'
      : 'Could not start verification. Please try again.';
    res.status(502).json({ error: friendly, detail: msg });
  }
});

// ── KYC status: current verification status for this tx's account (webview polls) ─
sep24Router.get('/kyc/status', async (req, res) => {
  const transaction_id = req.query.transaction_id as string | undefined;
  if (!transaction_id) { res.status(400).json({ error: 'Missing transaction_id' }); return; }
  try {
    const tx = await fetchTransaction(transaction_id);
    const status = await getStatus(resolveAccount(tx));
    res.json({ status });
  } catch (err) {
    console.error('[kyc/status] error:', err instanceof Error ? err.message : err);
    res.status(502).json({ status: 'PROCESSING', error: 'status check failed' });
  }
});

// more_info_url stub (config points the AP here). Real detail view: Phase E.
sep24Router.get('/transaction', (req, res) => {
  res.json({ id: req.query.transaction_id ?? null, note: 'more_info stub' });
});
