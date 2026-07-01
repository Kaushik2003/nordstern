// All Stellar/anchor operations go through the business server.
// In the browser, we call /biz/* which Next.js proxies to the business server.
// This avoids CORS issues and means the browser never needs @stellar/stellar-sdk.

const B = '/biz';

// ── Account ───────────────────────────────────────────────────────────────────

export interface Balances {
  xlm: string | null;
  anch: string | null; // null = no trustline
  error?: string;
}

export async function getAccount(address: string): Promise<Balances> {
  const r = await fetch(`${B}/api/account/${address}`);
  return r.json();
}

export async function friendbot(address: string): Promise<void> {
  if (process.env.NEXT_PUBLIC_IS_MAINNET === 'true') {
    throw new Error('Friendbot is only available on Testnet. Fund this account from an exchange or another wallet.');
  }
  const r = await fetch(`https://friendbot.stellar.org?addr=${address}`);
  if (!r.ok) throw new Error('Friendbot failed — account may already be funded');
}

// ── Transaction building ───────────────────────────────────────────────────────

export async function buildTrustlineXdr(account: string): Promise<string> {
  const r = await fetch(`${B}/api/xdr/trustline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.xdr as string;
}

export async function buildPaymentXdr(
  from: string,
  to: string,
  amount: string,
  memo: string,
): Promise<string> {
  const r = await fetch(`${B}/api/xdr/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, amount, memo }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.xdr as string;
}

export async function submitXdr(xdr: string): Promise<string> {
  const r = await fetch(`${B}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xdr }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d.hash as string;
}

// ── SEP-10 auth ───────────────────────────────────────────────────────────────

export async function sep10Challenge(account: string): Promise<string> {
  const r = await fetch(`${B}/sep/auth?account=${account}`);
  if (!r.ok) throw new Error(`SEP-10 challenge failed: ${await r.text()}`);
  const d = await r.json();
  return d.transaction as string;
}

export async function sep10Submit(signedXdr: string): Promise<string> {
  const r = await fetch(`${B}/sep/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: signedXdr }),
  });
  if (!r.ok) throw new Error(`SEP-10 auth failed: ${await r.text()}`);
  const d = await r.json();
  return d.token as string;
}

// ── SEP-24 ────────────────────────────────────────────────────────────────────

export interface Sep24Result {
  id: string;
  url: string;
}

export async function initiateSep24(
  kind: 'deposit' | 'withdraw',
  amount: string,
  jwt: string,
): Promise<Sep24Result> {
  const ep = kind === 'deposit' ? '/sep/deposit' : '/sep/withdraw';
  const r = await fetch(`${B}${ep}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ asset_code: 'ANCH', amount }),
  });
  if (!r.ok) throw new Error(`SEP-24 failed: ${await r.text()}`);
  return r.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTransaction(id: string, jwt: string): Promise<Record<string, any> | null> {
  const r = await fetch(`${B}/sep/tx/${id}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.transaction ?? null;
}
