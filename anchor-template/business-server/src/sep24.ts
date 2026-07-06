import { Router } from 'express';
import { ASSET_CODE, IS_MAINNET, TREASURY_PUBLIC, assetId } from './config.js';
import { fetchTransaction, patchTransaction } from './platform.js';
import { generateMemo, hasUsdcTrustline } from './stellar.js';
import { executeRelease } from './releases.js';
import { rate, deposit } from './adapters/index.js';
import { getStatus, createSession } from './adapters/kyc/didit.js';
import { verifyCheckout } from './adapters/deposit/razorpay.js';
import { pool } from './db.js';

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

// North-star brand mark (inline SVG — self-contained, no remote assets in the
// third-party wallet webview where these pages render).
const STAR = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 1.6l2.35 7.7 7.7 2.35-7.7 2.35L12 21.7l-2.35-7.7L1.95 11.65l7.7-2.35L12 1.6z" fill="url(#g)"/><defs><linearGradient id="g" x1="2" y1="2" x2="22" y2="22"><stop stop-color="#c7bef7"/><stop offset="1" stop-color="#8b7ee0"/></linearGradient></defs></svg>`;

// Shared premium shell. Dark, Phantom-inspired — mirrors the operator console's
// design tokens (client/app/globals.css): base #100f16, brand #ab9ff2, emerald-in.
// Body content supplies the h2 + cards + CTA; the shell adds the branded header
// with the network badge and wraps everything in a floating panel.
const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>
  :root{
    --bg:#100f16; --sunken:#0b0a10; --s1:#181722; --s2:#201f2d; --s3:#29283a;
    --bd:rgba(171,159,242,.15); --bd-strong:rgba(171,159,242,.30);
    --tx:#f4f3f7; --tx2:#a6a2b8; --tx3:#6e6a80;
    --brand:#ab9ff2; --brand2:#9b8dec; --fill:rgba(171,159,242,.14); --fill2:rgba(171,159,242,.24);
    --pos:#2ec08b; --pos-fill:rgba(46,192,139,.14); --warn:#f2b84b; --crit:#ff5a5a;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{color-scheme:dark;-webkit-text-size-adjust:100%}
  body{
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;
    background:radial-gradient(1100px 560px at 50% -12%,rgba(171,159,242,.12),transparent 60%),var(--bg);
    color:var(--tx);min-height:100vh;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
    display:flex;justify-content:center;align-items:flex-start;padding:22px 16px 44px;line-height:1.5;
  }
  .shell{width:100%;max-width:440px;animation:rise .4s cubic-bezier(.16,1,.3,1)}
  @keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .brand{display:flex;align-items:center;gap:9px;margin:2px 4px 16px}
  .brand svg{width:24px;height:24px;filter:drop-shadow(0 2px 8px rgba(171,159,242,.4))}
  .brand .nm{font-weight:650;font-size:15px;letter-spacing:.2px}
  .brand .net{margin-left:auto;font-size:9.5px;font-weight:650;letter-spacing:.09em;text-transform:uppercase;
    color:var(--brand);background:var(--fill);border:1px solid var(--bd);padding:4px 10px;border-radius:999px}
  .panel{background:linear-gradient(180deg,var(--s1),#131220);border:1px solid var(--bd);
    border-radius:22px;padding:22px;box-shadow:0 28px 70px rgba(6,4,12,.7)}
  h2{font-size:20px;font-weight:640;letter-spacing:-.3px;margin-bottom:4px}
  h3{font-size:17px;font-weight:640;margin-bottom:6px}
  h3.err,.err{color:var(--crit)}
  .sub{font-size:11.5px;color:var(--tx3);margin-bottom:18px;font-variant-numeric:tabular-nums;word-break:break-all}
  code{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:11px;color:var(--tx2)}
  .card{background:var(--s2);border:1px solid var(--bd);border-radius:14px;padding:13px 15px;margin:9px 0}
  .card.hero{background:linear-gradient(180deg,var(--s2),#1b1a28);border-color:var(--bd-strong)}
  .label{font-size:10px;color:var(--tx3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;font-weight:650}
  .value{font-family:ui-monospace,"JetBrains Mono",monospace;font-size:12.5px;color:var(--tx);word-break:break-all;line-height:1.55}
  .value.big{font-family:inherit;font-size:30px;font-weight:720;letter-spacing:-.6px;font-variant-numeric:tabular-nums}
  .value.recv{color:var(--pos)}
  .value.pay{color:var(--tx)}
  .unit{font-size:15px;font-weight:600;color:var(--tx2);margin-left:5px;letter-spacing:0}
  .rateline{font-size:11px;color:var(--tx3);margin-top:5px}
  .note{font-size:12px;color:var(--tx2);line-height:1.6;margin:14px 2px}
  .note.warn{color:var(--warn)}
  form{margin:0}
  .btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:15px;
    background:linear-gradient(180deg,var(--brand),var(--brand2));color:#171525;font-size:15px;font-weight:660;
    border:none;border-radius:14px;cursor:pointer;margin-top:16px;letter-spacing:.1px;
    transition:transform .14s,box-shadow .2s,opacity .2s;box-shadow:0 8px 26px rgba(171,159,242,.30)}
  .btn:hover{transform:translateY(-1px);box-shadow:0 12px 34px rgba(171,159,242,.44)}
  .btn:active{transform:translateY(0)}
  .btn:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}
  input[type=number]{width:100%;background:var(--sunken);border:1px solid var(--bd);border-radius:14px;
    color:var(--tx);font-size:34px;font-weight:720;padding:18px 16px;text-align:center;font-variant-numeric:tabular-nums;
    outline:none;transition:border-color .2s,box-shadow .2s}
  input[type=number]:focus{border-color:var(--bd-strong);box-shadow:0 0 0 3px rgba(171,159,242,.18)}
  input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  input[type=number]{-moz-appearance:textfield}
  .chips{display:flex;gap:8px;margin-top:12px}
  .chip{flex:1;text-align:center;padding:10px 0;border-radius:11px;background:var(--fill);color:var(--brand);
    font-size:13px;font-weight:640;cursor:pointer;border:1px solid var(--bd);font-variant-numeric:tabular-nums;
    transition:background .15s,border-color .15s,transform .12s}
  .chip:hover{background:var(--fill2);border-color:var(--bd-strong)}
  .chip:active{transform:scale(.97)}
  .qr{display:flex;justify-content:center;margin:14px 0}
  .qr img{border-radius:16px;border:1px solid var(--bd);padding:9px;background:#fff;max-width:210px}
  .center{display:flex;flex-direction:column;align-items:center;text-align:center;padding:6px 0 2px}
  .ring{width:66px;height:66px;border-radius:999px;display:grid;place-items:center;margin-bottom:15px}
  .ring.ok{background:var(--pos-fill);border:1px solid rgba(46,192,139,.32)}
  .ring.err{background:rgba(255,90,90,.12);border:1px solid rgba(255,90,90,.32)}
  .ring svg{width:30px;height:30px}
  .spinner{width:58px;height:58px;border-radius:999px;border:3px solid var(--bd);border-top-color:var(--brand);
    animation:spin 1s linear infinite;margin:4px auto 16px}
  @keyframes spin{to{transform:rotate(360deg)}}
  a{color:var(--brand)}
  .link{color:var(--brand);font-size:13px;text-decoration:none;font-weight:640;display:inline-flex;align-items:center;gap:5px}
  .link:hover{text-decoration:underline}
  .status{font-size:12.5px;color:var(--tx2);margin-top:12px;text-align:center;min-height:18px}
  pre{background:var(--sunken);border:1px solid var(--bd);border-radius:12px;padding:12px;font-size:11.5px;
    color:var(--tx2);white-space:pre-wrap;word-break:break-word;margin-top:12px;font-family:ui-monospace,monospace}
  iframe{width:100%;height:70vh;border:0;border-radius:14px;margin-top:6px}
</style></head><body>
  <div class="shell">
    <div class="brand">${STAR}<span class="nm">NordStern</span><span class="net">${IS_MAINNET ? 'Mainnet' : 'Testnet'}</span></div>
    <div class="panel">${body}</div>
  </div>
</body></html>`;

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
  return page('Verify your identity', `
    <h2>Verify your identity</h2>
    <p class="sub">Transaction <code>${transactionId}</code></p>
    <div id="consent">
      <div class="card">
        <div class="label">One-time identity check</div>
        <p class="note" style="margin:6px 0 0">Before you can ${action}, we need to verify your identity. This opens a
          secure flow (powered by DIDIT): you'll photograph your ID and take a quick selfie. Your camera is
          used only for this verification, and we store only the result — not your documents.</p>
      </div>
      <button id="verifyBtn" class="btn" type="button">Verify my identity</button>
    </div>
    <div id="frameWrap" style="margin-top:.5rem"></div>
    <p class="status" id="kycStatus"></p>
    <script>${kycClientScript(transactionId)}</script>`);
}

// ── Amount entry: shown when the wallet didn't pass `amount` up front ────────────
// SEP-24 allows the initial request to omit `amount`; the anchor is expected to
// collect it in the interactive flow instead. Money-affecting, so the value is
// written to OUR OWN store (POST /interactive/amount) and re-read server-side on
// every subsequent step — never taken from a client form directly. It cannot be
// PATCHed onto the Platform transaction: this AP version's PATCH /transactions
// endpoint only updates amountIn/amountOut, not amount_expected.
async function getStoredAmount(transactionId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT amount FROM nordstern.interactive_amounts WHERE transaction_id = $1',
    [transactionId],
  );
  return rows[0]?.amount ?? null;
}

async function setStoredAmount(transactionId: string, amount: string): Promise<void> {
  await pool.query(
    `INSERT INTO nordstern.interactive_amounts (transaction_id, amount) VALUES ($1, $2)
     ON CONFLICT (transaction_id) DO UPDATE SET amount = EXCLUDED.amount`,
    [transactionId, amount],
  );
}

function amountFormPage(transactionId: string, kind: string): string {
  const action = kind === 'withdrawal' ? 'withdraw' : 'deposit';
  const presets = [10, 50, 100];
  return page(`${action[0].toUpperCase()}${action.slice(1)} ${ASSET_CODE}`, `
    <h2>How much do you want to ${action}?</h2>
    <p class="sub">Enter an amount in ${ASSET_CODE} · <code>${transactionId}</code></p>
    <form method="POST" action="/sep24/interactive/amount">
      <input type="hidden" name="transaction_id" value="${transactionId}" />
      <input id="amt" type="number" name="amount" inputmode="decimal" step="0.01" min="0.01" required
        placeholder="0.00" autofocus autocomplete="off" />
      <div class="chips">
        ${presets.map((p) => `<span class="chip" data-v="${p}">${p} ${ASSET_CODE}</span>`).join('')}
      </div>
      <button type="submit" class="btn">Continue</button>
    </form>
    <script>
      (function(){
        var amt=document.getElementById('amt');
        document.querySelectorAll('.chip').forEach(function(c){
          c.addEventListener('click',function(){amt.value=c.getAttribute('data-v');amt.focus();});
        });
      })();
    </script>`);
}

// Client-side Razorpay Checkout: button click → open the Razorpay pop-up with the
// server-created order → on success POST /razorpay/verify → on verified, submit the
// hidden /complete form (which releases USDC). No backticks so it embeds cleanly in
// the page template literal. Reused as-is inside the mobile webview later.
const razorpayClientScript = (
  txId: string,
  order: { orderId: string; keyId: string; amountPaise: number; name: string },
  usdcAmount: string,
) => `
(function(){
  var txId = ${JSON.stringify(txId)};
  var usdc = ${JSON.stringify(usdcAmount)};
  var btn = document.getElementById('payBtn');
  var statusEl = document.getElementById('payStatus');
  function setStatus(m){ statusEl.textContent = m; }
  function verify(resp){
    setStatus('Verifying payment…');
    fetch('/sep24/razorpay/verify', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ transaction_id: txId,
        razorpay_order_id: resp.razorpay_order_id,
        razorpay_payment_id: resp.razorpay_payment_id,
        razorpay_signature: resp.razorpay_signature })
    })
    .then(function(r){ return r.json().then(function(j){ return { ok:r.ok, j:j }; }); })
    .then(function(res){
      if(!res.ok || !res.j.ok){ setStatus((res.j && res.j.error) || 'We could not verify the payment. If money was debited it will be reconciled.'); return; }
      setStatus('Payment verified — releasing ' + usdc + ' USDC…');
      document.getElementById('completeForm').submit();
    })
    .catch(function(){ setStatus('Network error verifying payment. If money was debited it will be reconciled.'); });
  }
  function openCheckout(){
    if(typeof Razorpay === 'undefined'){ setStatus('Payment library failed to load — check your connection and reload.'); btn.disabled=false; return; }
    var rzp = new Razorpay({
      key: ${JSON.stringify(order.keyId)},
      order_id: ${JSON.stringify(order.orderId)},
      amount: ${order.amountPaise},
      currency: 'INR',
      name: ${JSON.stringify(order.name)},
      description: 'Deposit ' + usdc + ' USDC',
      theme: { color: '#ab9ff2' },
      handler: function(resp){ verify(resp); },
      modal: { ondismiss: function(){ setStatus('Payment cancelled — you can try again.'); btn.disabled=false; } }
    });
    rzp.on('payment.failed', function(resp){ setStatus('Payment failed: ' + ((resp.error && resp.error.description) || 'please try again')); btn.disabled=false; });
    rzp.open();
  }
  btn.addEventListener('click', function(){ btn.disabled = true; setStatus('Opening secure payment…'); openCheckout(); });
})();`;

// ── Deposit release: shared money-mover for the webview return AND the webhook ────
// Idempotent. Verifies KYC + trustline + reserve, then transfers USDC treasury→user
// and completes the Platform transaction. For a verified-collection provider
// (Razorpay) it is guarded by an ATOMIC paid→releasing claim, so the user returning
// and the webhook firing can never both send. INR comes from the LOCKED order, never
// recomputed — so the recorded amount_in equals what was actually charged.
export type ReleaseOutcome =
  | { kind: 'released'; hash: string; usdcAmount: string; inrAmount: string; inrPerUsdc: string; rateSource: string }
  | { kind: 'already' }
  | { kind: 'not_ready'; message: string };

export async function releaseDeposit(transactionId: string): Promise<ReleaseOutcome> {
  const tx = await fetchTransaction(transactionId);

  // KYC is a money-affecting precondition — enforce server-side on every path.
  const account = resolveAccount(tx);
  if ((await getStatus(account).catch(() => 'NEEDS_INFO')) !== 'ACCEPTED') {
    throw new Error('identity verification required');
  }

  if (tx.status === 'completed') return { kind: 'already' };

  // mock/upi have no atomic claim — keep the coarse resend guard on Platform status.
  if (!deposit.claimForRelease && (tx.status === 'pending_anchor' || tx.status === 'error')) {
    throw new Error(
      `transaction is in state '${tx.status}' — a prior attempt may have released USDC. ` +
      `Refusing to auto-resend; manual reconciliation required.`,
    );
  }

  const destination = tx.destination_account;
  if (!destination) throw new Error('no destination_account on transaction');

  // Amount is read server-side (Platform expected amount or our stored value). For a
  // verified-collection provider this is only a fallback — the authoritative amount
  // comes from the locked order once we claim below.
  const apAmount = tx.amount_expected?.amount;
  const rawAmount = (apAmount && Number(apAmount) > 0) ? apAmount : await getStoredAmount(transactionId);
  if (!rawAmount || Number(rawAmount) <= 0) throw new Error('no amount set for this transaction');

  // Trustline is amount-independent, so check it BEFORE we claim — a user-fixable
  // failure (no trustline) then doesn't consume the one-shot payment claim.
  if (!(await hasUsdcTrustline(destination))) {
    throw new Error(`destination ${destination} has no ${ASSET_CODE} trustline — add it in your wallet, then retry`);
  }

  // Payment gate + double-send guard. For Razorpay BOTH amounts come from the LOCKED
  // order (never re-derived), so we settle and record exactly what was charged even
  // if the stored amount was changed after payment.
  let usdcAmount = rawAmount;
  let inrAmount: string, inrPerUsdc: string, rateSource: string;
  if (deposit.claimForRelease) {
    const claim = await deposit.claimForRelease(transactionId);   // atomic paid → releasing
    if (!claim) return { kind: 'not_ready', message: 'Payment not yet confirmed, or this deposit is already being processed.' };
    usdcAmount = claim.amountUsdc; inrAmount = claim.inrAmount; inrPerUsdc = claim.inrPerUsdc; rateSource = claim.rateSource;
  } else {
    const q = await rate.quote();
    inrPerUsdc = String(q.inrPerUsdc); rateSource = q.source;
    inrAmount = (Number(usdcAmount) * Number(q.inrPerUsdc)).toFixed(2);
  }

  // Hand the money-move to the durable, idempotent outbox. It writes intent BEFORE
  // submitting to Stellar (crash-recoverable), attaches the deterministic memo so a
  // landed transfer can be found on-chain, and atomically single-locks the release —
  // the webview-return and webhook paths can never both send.
  const memo = generateMemo(transactionId);
  try {
    const outcome = await executeRelease({
      transactionId, destination, usdcAmount, inrAmount, inrPerUsdc, rateSource, memo,
    });
    if (outcome.kind === 'in_flight') {
      return { kind: 'not_ready', message: 'This deposit is already being processed — it will complete shortly.' };
    }
    // released | already → keep the provider's own bookkeeping (Razorpay) in sync.
    if (deposit.markReleased) await deposit.markReleased(transactionId, outcome.hash);
    if (outcome.kind === 'already') return { kind: 'already' };
    return { kind: 'released', hash: outcome.hash, usdcAmount, inrAmount, inrPerUsdc, rateSource };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (deposit.markReleaseFailed) await deposit.markReleaseFailed(transactionId, msg);
    await patchTransaction(transactionId, { status: 'error', message: msg }).catch(() => {});
    throw err;
  }
}

// ── POST amount: persist the user-entered amount to our own store ───────────────
sep24Router.post('/interactive/amount', async (req, res) => {
  const { transaction_id, amount } = req.body as Record<string, string>;
  if (!transaction_id) { res.status(400).send('Missing transaction_id'); return; }
  const n = Number(amount);
  if (!amount || !Number.isFinite(n) || n <= 0) {
    res.status(400).type('html').send(page('Invalid amount', `
      <h3 class="err">Enter a valid amount</h3>
      <p class="note"><a href="/sep24/interactive?transaction_id=${encodeURIComponent(transaction_id)}">Back</a></p>`));
    return;
  }
  try {
    // Stellar amounts allow at most 7 digits after the decimal; 2 matches the
    // precision already shown/used elsewhere in this flow.
    await setStoredAmount(transaction_id, n.toFixed(2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).type('html').send(page('Error', `<h3 class="err">Could not set amount</h3><pre>${msg}</pre>`));
    return;
  }
  res.redirect(`/sep24/interactive?transaction_id=${encodeURIComponent(transaction_id)}`);
});

// ── GET interactive: render the deposit / withdraw screen ───────────────────────
sep24Router.get('/interactive', async (req, res) => {
  const { transaction_id } = req.query as Record<string, string>;
  if (!transaction_id) { res.status(400).send('<h3>Missing transaction_id</h3>'); return; }

  let tx: Record<string, any>;
  try { tx = await fetchTransaction(transaction_id); }
  catch (err) { res.status(500).send(`<h3>Platform API error</h3><pre>${err}</pre>`); return; }

  const kind = tx.kind ?? 'deposit';

  // ── Strategy config checks ──────────────────────────────────────────────────
  const strategy = await pool.query('SELECT config FROM nordstern.strategy_config ORDER BY version DESC LIMIT 1').then(r => r.rows[0]?.config ?? null);
  if (strategy && (strategy.emergencyStop || strategy.maintenanceMode)) {
    res.type('html').send(page('Service Paused', `
      <div class="center">
        <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
        <h2>Service Paused</h2>
        <p class="note" style="text-align:center">The service is temporarily suspended. Please try again later.</p>
      </div>`));
    return;
  }

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

  // The AP can report amount_expected as '0' (not null) when the wallet omitted
  // it — so route both empty AND '0'/non-positive to our stored fallback, not just
  // null. (`??` would keep a literal '0' and loop the user back to the form forever.)
  const apAmount = tx.amount_expected?.amount;
  const rawAmount = (apAmount && Number(apAmount) > 0) ? apAmount : await getStoredAmount(transaction_id);
  if (!rawAmount || Number(rawAmount) <= 0) {
    res.type('html').send(amountFormPage(transaction_id, kind));
    return;
  }
  const usdcAmount = rawAmount;
  if (strategy) {
    const amt = Number(usdcAmount);
    if (amt < strategy.minDeposit || amt > strategy.maxDeposit) {
      res.type('html').send(page('Limit Exceeded', `
        <div class="center">
          <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
          <h2>Operational Limits Exceeded</h2>
          <p class="note" style="text-align:center">This transaction amount (${amt} USDC) violates permitted operational bounds (Min: ${strategy.minDeposit} USDC, Max: ${strategy.maxDeposit} USDC).</p>
        </div>`));
      return;
    }
  }
  const memo = generateMemo(transaction_id);

  if (kind === 'withdrawal') {
    res.type('html').send(page(`Withdraw ${ASSET_CODE}`, `
      <h2>Withdraw ${ASSET_CODE}</h2>
      <p class="sub">Transaction <code>${transaction_id}</code></p>
      <div class="card hero"><div class="label">You send</div>
        <div class="value big">${usdcAmount}<span class="unit">${ASSET_CODE}</span></div></div>
      <div class="card"><div class="label">Send your ${ASSET_CODE} to</div><div class="value">${TREASURY_PUBLIC}</div></div>
      <div class="card"><div class="label">Memo (text) — required</div><div class="value">${memo}</div></div>
      <p class="note">Send exactly ${usdcAmount} ${ASSET_CODE} with the memo above, then confirm.
        The anchor detects the transfer and pays out INR (payout is simulated in Phase C).</p>
      <form method="POST" action="/sep24/interactive/complete">
        <input type="hidden" name="transaction_id" value="${transaction_id}" />
        <button type="submit" class="btn">I have sent ${usdcAmount} ${ASSET_CODE}</button>
      </form>`));
    return;
  }

  // Deposit — compute INR to pay from the FX rate.
  const q = await rate.quote();
  const inrAmount = (Number(usdcAmount) * Number(q.inrPerUsdc)).toFixed(2);

  // ── Razorpay collection (real, verified) ───────────────────────────────────
  // Fail fast on a missing trustline BEFORE we let the user pay (so nobody is
  // charged for USDC we can't deliver), create/reuse the locked order, then render
  // Checkout. USDC is released only after POST /razorpay/verify or the webhook.
  if (deposit.createOrder) {
    const destination = tx.destination_account;
    if (!destination) { res.status(400).send('<h3>no destination_account on transaction</h3>'); return; }
    if (!(await hasUsdcTrustline(destination))) {
      res.type('html').send(page(`Deposit ${ASSET_CODE}`, `
        <h2>Add a ${ASSET_CODE} trustline</h2>
        <p class="sub">Transaction <code>${transaction_id}</code></p>
        <div class="card"><div class="label">One step in your wallet</div>
          <p class="note" style="margin:6px 0 0">Your wallet must add a ${ASSET_CODE} trustline before it can receive tokens.
            Add ${ASSET_CODE} in your wallet, then reload this page to pay.</p></div>
        <div class="card"><div class="label">Your address</div><div class="value">${destination}</div></div>`));
      return;
    }
    let order;
    try {
      order = await deposit.createOrder({
        transactionId: transaction_id, usdcAmount,
        inrAmount, inrPerUsdc: String(q.inrPerUsdc), rateSource: q.source,
        account, destination,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[razorpay/order] error:', msg);
      res.status(502).type('html').send(page('Payment unavailable', `<h3 class="err">Could not start payment</h3><pre>${msg}</pre>`));
      return;
    }
    res.type('html').send(page(`Deposit ${ASSET_CODE}`, `
      <h2>Deposit ${ASSET_CODE}</h2>
      <p class="sub">Transaction <code>${transaction_id}</code></p>
      <div class="card hero"><div class="label">You receive</div>
        <div class="value big recv">${usdcAmount}<span class="unit">${ASSET_CODE}</span></div></div>
      <div class="card"><div class="label">You pay</div>
        <div class="value big pay">₹${order.inrAmount}</div>
        <div class="rateline">1 ${ASSET_CODE} = ₹${order.inrPerUsdc} · ${order.rateSource}</div></div>
      <p class="note">Pay securely via Razorpay (UPI, cards, netbanking). ${ASSET_CODE} is released to your
        wallet only after we verify your payment.</p>
      <button id="payBtn" class="btn" type="button">Pay ₹${order.inrAmount} securely</button>
      <p class="status" id="payStatus"></p>
      <form id="completeForm" method="POST" action="/sep24/interactive/complete" style="display:none">
        <input type="hidden" name="transaction_id" value="${transaction_id}" />
      </form>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <script>${razorpayClientScript(transaction_id, order, usdcAmount)}</script>`));
    return;
  }

  // ── mock / upi fiat-in instructions (sandbox, unverified) ──────────────────
  const instr = await deposit.instructions({ transactionId: transaction_id, inrAmount, usdcAmount, memo });

  res.type('html').send(page(`Deposit ${ASSET_CODE}`, `
    <h2>Deposit ${ASSET_CODE}</h2>
    <p class="sub">Transaction <code>${transaction_id}</code></p>
    <div class="card hero"><div class="label">You receive</div>
      <div class="value big recv">${usdcAmount}<span class="unit">${ASSET_CODE}</span></div></div>
    <div class="card"><div class="label">You pay</div>
      <div class="value big pay">₹${inrAmount}</div>
      <div class="rateline">1 ${ASSET_CODE} = ₹${q.inrPerUsdc} · ${q.source}</div></div>
    <div class="card"><div class="label">${instr.label}</div><div class="value">${instr.lines.join('<br>')}</div></div>
    ${instr.qrDataUri ? `<div class="qr"><img src="${instr.qrDataUri}" alt="Scan to pay" /></div>` : ''}
    <p class="note">${instr.note}</p>
    <form method="POST" action="/sep24/interactive/complete">
      <input type="hidden" name="transaction_id" value="${transaction_id}" />
      <button type="submit" class="btn">Confirm — release ${usdcAmount} ${ASSET_CODE}</button>
    </form>`));
});

// ── POST complete: perform the money movement ───────────────────────────────────
sep24Router.post('/interactive/complete', async (req, res) => {
  const { transaction_id } = req.body as Record<string, string>;
  if (!transaction_id) { res.status(400).send('Missing transaction_id'); return; }

  let tx: Record<string, any>;
  try { tx = await fetchTransaction(transaction_id); }
  catch (err) { res.status(500).send(`<h3>Platform API error</h3><pre>${err}</pre>`); return; }

  // ── Strategy config checks ──────────────────────────────────────────────────
  const strategy = await pool.query('SELECT config FROM nordstern.strategy_config ORDER BY version DESC LIMIT 1').then(r => r.rows[0]?.config ?? null);
  if (strategy && (strategy.emergencyStop || strategy.maintenanceMode)) {
    res.status(503).type('html').send(page('Service Suspended', `
      <div class="center">
        <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
        <h2>Service Paused</h2>
        <p class="note" style="text-align:center">The service is temporarily suspended. Please try again later.</p>
      </div>`));
    return;
  }

  // ── KYC enforcement (money-affecting precondition) ──────────────────────────
  // The GET /interactive gate only controls DISPLAY. Money actually moves here, so
  // KYC must be enforced SERVER-SIDE — otherwise this endpoint can be POSTed
  // directly to bypass the iframe. Same principle as the amount/destination:
  // never trust the client form. Covers deposit (USDC release) and withdrawal
  // (the pending_user_transfer_start transition the poller later acts on).
  const account = resolveAccount(tx);
  if ((await getStatus(account).catch(() => 'NEEDS_INFO')) !== 'ACCEPTED') {
    res.status(403).type('html').send(page('Verification required', `
      <div class="center">
        <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
        <h2>Verification required</h2>
        <p class="note" style="text-align:center">Complete identity verification before this transaction can proceed.</p>
      </div>`));
    return;
  }

  const kind = tx.kind ?? 'deposit';
  // Same '0'-vs-null handling as GET /interactive — see note there.
  const apAmount = tx.amount_expected?.amount;
  const rawAmount = (apAmount && Number(apAmount) > 0) ? apAmount : await getStoredAmount(transaction_id);
  if (!rawAmount || Number(rawAmount) <= 0) {
    res.status(400).type('html').send(page('Missing amount', `
      <h3 class="err">No amount set for this transaction</h3>
      <p class="note"><a href="/sep24/interactive?transaction_id=${encodeURIComponent(transaction_id)}">Go back and enter an amount</a></p>`));
    return;
  }
  const usdcAmount = rawAmount;
  if (strategy) {
    const amt = Number(usdcAmount);
    if (amt < strategy.minDeposit || amt > strategy.maxDeposit) {
      res.status(400).type('html').send(page('Limit Exceeded', `
        <div class="center">
          <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
          <h2>Operational Limits Exceeded</h2>
          <p class="note" style="text-align:center">This transaction amount (${amt} USDC) violates permitted operational bounds (Min: ${strategy.minDeposit} USDC, Max: ${strategy.maxDeposit} USDC).</p>
        </div>`));
      return;
    }
  }
  const memo = generateMemo(transaction_id);

  try {
    // ── Withdrawal: record the expected transfer; detection/payout is Phase C ──
    if (kind === 'withdrawal') {
      await patchTransaction(transaction_id, {
        status: 'pending_user_transfer_start', memo, memo_type: 'text',
      });
      res.type('html').send(page('Waiting for transfer', `
        <div class="center"><div class="spinner"></div>
          <h2>Waiting for your ${ASSET_CODE}</h2></div>
        <div class="card"><div class="label">Send to</div><div class="value">${TREASURY_PUBLIC}</div></div>
        <div class="card"><div class="label">Amount</div><div class="value">${usdcAmount} ${ASSET_CODE}</div></div>
        <div class="card"><div class="label">Memo (text)</div><div class="value">${memo}</div></div>
        <p class="note">Once received, the anchor releases INR (Phase C). You can close this page.</p>
        <script>try{window.parent.postMessage({type:'sep24_withdrawal_pending',txId:'${transaction_id}',memo:'${memo}'},'*')}catch(e){}</script>`));
      return;
    }

    // ── Deposit on-ramp ──────────────────────────────────────────────────────
    // Gate on a VERIFIED payment (Razorpay: real; mock/upi: always true), then hand
    // off to the shared, idempotent releaseDeposit — the same function the webhook
    // calls, so a user who closed the tab still gets tokens and neither path can
    // double-send.
    if (!(await deposit.isPaid({ transactionId: transaction_id }))) {
      res.status(402).type('html').send(page('Payment required', `
        <div class="center">
          <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
          <h2>Payment not received</h2>
          <p class="note" style="text-align:center">We haven't received a confirmed payment for this deposit yet.
            <a class="link" href="/sep24/interactive?transaction_id=${encodeURIComponent(transaction_id)}">Go back and pay</a>.</p>
        </div>`));
      return;
    }

    const outcome = await releaseDeposit(transaction_id);

    if (outcome.kind === 'already') {
      res.type('html').send(page('Deposit complete', `
        <div class="center">
          <div class="ring ok"><svg viewBox="0 0 24 24" fill="none" stroke="#2ec08b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></div>
          <h2>Already completed</h2>
          <p class="note" style="text-align:center">This transaction has already been settled.</p>
        </div>`));
      return;
    }
    if (outcome.kind === 'not_ready') {
      res.type('html').send(page('Completing your deposit', `
        <div class="center"><div class="spinner"></div><h2>Finishing up…</h2></div>
        <p class="note" style="text-align:center">${outcome.message}</p>
        <script>try{window.parent.postMessage({type:'sep24_deposit_pending',txId:'${transaction_id}'},'*')}catch(e){}</script>`));
      return;
    }

    const { hash, usdcAmount: releasedUsdc, inrAmount, inrPerUsdc } = outcome;
    res.type('html').send(page('Deposit complete', `
      <div class="center">
        <div class="ring ok"><svg viewBox="0 0 24 24" fill="none" stroke="#2ec08b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></div>
        <h2>Deposit complete</h2>
      </div>
      <div class="card hero" style="text-align:center"><div class="label">Delivered to your wallet</div>
        <div class="value big recv">${releasedUsdc}<span class="unit">${ASSET_CODE}</span></div>
        <div class="rateline">for ₹${inrAmount} · 1 ${ASSET_CODE} = ₹${inrPerUsdc}</div></div>
      <p class="note" style="text-align:center"><a class="link" href="https://stellar.expert/explorer/${IS_MAINNET ? 'public' : 'testnet'}/tx/${hash}" target="_blank" rel="noopener">View on Stellar Expert →</a></p>
      <script>try{window.parent.postMessage({type:'sep24_deposit_complete',txId:'${transaction_id}',hash:'${hash}'},'*')}catch(e){}</script>`));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[complete] error:', msg);
    // Reflect the failure in Platform state so the tx isn't stuck mid-flight.
    await patchTransaction(transaction_id, { status: 'error', message: msg }).catch(() => {});
    res.status(500).type('html').send(page('Error', `<h3 class="err">Error</h3><pre>${msg}</pre>`));
  }
});

// ── Razorpay: verify the Checkout callback (webview return path) ─────────────────
// The pop-up's success handler POSTs the order/payment/signature here. We verify the
// HMAC signature AND re-check with Razorpay that the order is paid before marking it
// releasable. The client then submits the hidden /complete form (which releases). The
// webhook is the independent source of truth for the closed-tab case.
sep24Router.post('/razorpay/verify', async (req, res) => {
  const b = (req.body ?? {}) as Record<string, string>;
  const { transaction_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b;
  if (!transaction_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ ok: false, error: 'Missing verification fields' });
    return;
  }
  try {
    await verifyCheckout({
      transactionId: transaction_id, orderId: razorpay_order_id,
      paymentId: razorpay_payment_id, signature: razorpay_signature,
    });
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[razorpay/verify] error:', msg);
    res.status(400).json({ ok: false, error: 'Payment verification failed', detail: msg });
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

// ── more_info_url: user-facing transaction detail (wallets open this) ────────────
// Renders the live Platform state for one transaction — status, amounts, memo,
// destination, and the settling Stellar tx — in the same branded shell as the rest
// of the interactive flow. Read-only. Auto-refreshes while the tx is non-terminal.

// "10.00 USDC" / "₹885.00" from a Platform {amount, asset} object, or null.
function fmtAmount(a: any): string | null {
  if (!a || a.amount == null) return null;
  const asset = String(a.asset ?? '');
  if (asset.includes('INR')) return `₹${a.amount}`;
  const code = asset.startsWith('stellar:') ? asset.split(':')[1] : (asset || ASSET_CODE);
  return `${a.amount} ${code}`;
}

function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toUTCString().replace('GMT', 'UTC');
}

function statusPill(status: string): string {
  const s = String(status || '');
  let color = 'var(--tx3)', bg = 'var(--s3)';
  if (s === 'completed') { color = 'var(--pos)'; bg = 'var(--pos-fill)'; }
  else if (s === 'error' || s === 'expired') { color = 'var(--crit)'; bg = 'rgba(255,90,90,.14)'; }
  else if (s.startsWith('pending') || s === 'incomplete') { color = 'var(--warn)'; bg = 'rgba(242,184,75,.14)'; }
  return `<span style="display:inline-block;font-size:10.5px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:${color};background:${bg};border:1px solid color-mix(in srgb, ${color} 34%, transparent);padding:5px 11px;border-radius:999px">${s.replace(/_/g, ' ')}</span>`;
}

const detailCard = (label: string, value: string) =>
  `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`;

sep24Router.get('/transaction', async (req, res) => {
  const transaction_id = (req.query.transaction_id ?? req.query.id) as string | undefined;
  if (!transaction_id) {
    res.status(400).type('html').send(page('Transaction', `<h3 class="err">Missing transaction_id</h3>`));
    return;
  }

  let tx: Record<string, any>;
  try {
    tx = await fetchTransaction(transaction_id);
  } catch {
    res.status(404).type('html').send(page('Transaction not found', `
      <div class="center">
        <div class="ring err"><svg viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" stroke-width="2.2" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg></div>
        <h2>Transaction not found</h2>
        <p class="note" style="text-align:center">We couldn't find <code>${transaction_id}</code>.</p>
      </div>`));
    return;
  }

  const kind = tx.kind ?? 'deposit';
  const isWithdraw = kind === 'withdrawal';
  const title = isWithdraw ? 'Withdrawal' : 'Deposit';
  const status = String(tx.status ?? 'unknown');
  const terminal = status === 'completed' || status === 'error' || status === 'refunded';

  const amtIn = fmtAmount(tx.amount_in) ?? fmtAmount(tx.amount_expected);
  const amtOut = fmtAmount(tx.amount_out);
  const hash = tx.stellar_transactions?.[0]?.id ?? null;
  const net = IS_MAINNET ? 'public' : 'testnet';

  const cards = [
    amtOut ? `<div class="card hero"><div class="label">${isWithdraw ? 'You receive' : 'You receive'}</div>
      <div class="value big recv">${amtOut}</div></div>` : '',
    amtIn ? detailCard(isWithdraw ? 'You send' : 'You pay', amtIn) : '',
    tx.memo ? detailCard(`Memo${tx.memo_type ? ` (${tx.memo_type})` : ''}`, String(tx.memo)) : '',
    tx.destination_account ? detailCard(isWithdraw ? 'Treasury' : 'Destination', String(tx.destination_account)) : '',
    hash ? `<div class="card"><div class="label">Stellar transaction</div>
      <div class="value">${hash}</div>
      <p style="margin-top:8px"><a class="link" href="https://stellar.expert/explorer/${net}/tx/${hash}" target="_blank" rel="noopener">View on Stellar Expert →</a></p></div>` : '',
    fmtDate(tx.started_at) ? detailCard('Started', fmtDate(tx.started_at)!) : '',
    fmtDate(tx.completed_at) ? detailCard('Completed', fmtDate(tx.completed_at)!) : '',
  ].filter(Boolean).join('');

  res.type('html').send(page(`${title} · ${transaction_id}`, `
    <h2>${title}</h2>
    <p class="sub">Transaction <code>${transaction_id}</code></p>
    <div style="margin:2px 0 16px">${statusPill(status)}</div>
    ${cards}
    ${tx.message ? `<p class="note warn">${tx.message}</p>` : ''}
    ${terminal ? '' : `<p class="status">This page refreshes automatically…</p>
      <script>setTimeout(function(){location.reload()}, 8000)</script>`}`));
});
