/**
 * Money-safety live test (real testnet) — proves the deposit-release idempotency
 * LINCHPIN that the whole crash-recovery / no-double-send guarantee rests on:
 *
 *   1. `sendUsdc(dest, amount, memo)` attaches the deterministic text memo on-chain.
 *   2. `findTreasuryPayment(dest, amount, memo)` can later LOCATE that exact transfer
 *      from the chain and return its hash — so a crashed/retried release ADOPTS the
 *      prior transfer instead of sending a second one.
 *   3. Negative cases: a different memo or amount does NOT match (no false adoption).
 *
 * These are the two functions in `stellar.ts` that were not yet exercised live (the
 * outbox state machine itself is separately verified against Postgres). We import the
 * REAL shipped functions (via tsx) rather than reimplementing them.
 *
 * Uses a treasury SELF-payment (treasury -> treasury, USDC) so no funded recipient is
 * needed; `findTreasuryPayment` matches on to+asset+amount+memo identically. Net-zero
 * USDC, costs only the base XLM fee. Non-destructive.
 *
 *   node --import tsx scripts/test-idempotency.mjs
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

// Load .env into process.env BEFORE importing the module under test (config.ts reads
// env at import time). Strip surrounding quotes so a quoted passphrase is clean.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}

// The REAL functions under test.
const { sendUsdc, findTreasuryPayment, generateMemo, getTreasuryBalances } =
  await import('../business-server/src/stellar.ts');

const ok = (m) => console.log(`  ✓ ${m}`);
const fail = (m) => { console.error(`  ✗ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findWithRetry(dest, amount, memo, tries = 6, gap = 5000) {
  for (let i = 0; i < tries; i++) {
    const r = await findTreasuryPayment(dest, amount, memo);
    if (r) return r;
    if (i < tries - 1) { console.log(`     …not indexed yet, retry ${i + 1}/${tries - 1} in ${gap / 1000}s`); await sleep(gap); }
  }
  return null;
}

const TREASURY = process.env.TREASURY_PUBLIC;
const AMOUNT = '0.01';
const memo = generateMemo(randomUUID());   // realistic unique 8-char deposit memo

console.log('=== Idempotency linchpin live test (real testnet) ===\n');
console.log(`  Treasury: ${TREASURY}`);
console.log(`  Memo:     ${memo}    Amount: ${AMOUNT} USDC\n`);

// Pre-flight: treasury must hold XLM (fees) + some USDC.
const bal = await getTreasuryBalances();
console.log(`  Treasury balances: ${bal.usdc ?? '—'} USDC · ${bal.xlm ?? '—'} XLM\n`);
if (bal.usdc === null || Number(bal.usdc) < Number(AMOUNT)) fail('treasury USDC float too low — run scripts/fund-treasury.mjs');

// 0. Fresh memo must not already match (no false positive out of the gate).
if (await findTreasuryPayment(TREASURY, AMOUNT, memo)) fail('a fresh, unused memo unexpectedly matched an existing transfer');
ok('pre-check: an unused memo matches nothing');

// 1. Real on-chain send carrying the memo.
console.log('  sending 0.01 USDC treasury→treasury with the memo…');
const hash = await sendUsdc(TREASURY, AMOUNT, memo);
ok(`sendUsdc submitted on-chain: ${hash}`);

// 2. THE linchpin: the reconciler's chain query must find that exact transfer.
const found = await findWithRetry(TREASURY, AMOUNT, memo);
if (!found) fail('findTreasuryPayment did NOT locate the landed transfer — crash-recovery would be broken');
if (found.hash !== hash) fail(`findTreasuryPayment returned the wrong tx hash (${found.hash} != ${hash})`);
ok(`findTreasuryPayment located it by memo and returned the matching hash`);

// 3. Negative: a different memo must not match (idempotency must not false-adopt).
if (await findTreasuryPayment(TREASURY, AMOUNT, 'NOTAMEMO')) fail('a wrong memo matched — would cause a false "already sent" and lost delivery');
ok('negative: a different memo does not match');

// 4. Negative: the right memo but a wrong amount must not match.
if (await findTreasuryPayment(TREASURY, '999.99', memo)) fail('a wrong amount matched — amount is part of the transfer identity');
ok('negative: a wrong amount does not match');

console.log('\n✅ Linchpin verified on real testnet:');
console.log('   sendUsdc attaches the deterministic memo, and findTreasuryPayment locates the');
console.log('   exact landed transfer by memo+destination+amount. This is what lets a retried or');
console.log('   crash-recovered release ADOPT the prior transfer instead of double-sending.\n');
