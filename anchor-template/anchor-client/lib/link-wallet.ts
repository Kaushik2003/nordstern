'use client';

// Prove-then-link a wallet to the central NordStern identity (Identity Phase 1).
// A wallet is attached only after the customer signs a server-issued challenge — never by
// asserting an address. Shared by the Profile "connect & verify" action and the buy/sell
// money paths (where linking is best-effort: it enables cross-anchor KYC reuse and scopes
// the customer's transaction history, but a decline never blocks the payment itself).

import { customer as api } from './customer';
import { signTransaction } from './wallet';

const NETWORK: 'testnet' | 'mainnet' =
  (process.env.NEXT_PUBLIC_NET_PASS ?? '').includes('Public Global') ? 'mainnet' : 'testnet';

// Ensure `address` is a proven, linked wallet. No-op (and no signature prompt) if it is
// already linked. Otherwise runs challenge → sign → verify. Throws on failure/decline so the
// caller can decide whether it's fatal (Profile) or best-effort (buy/sell).
export async function ensureWalletLinked(address: string): Promise<void> {
  const linked = await api.wallets().catch(() => []);
  if (linked.some((w) => w.address === address)) return;
  const { challengeXdr } = await api.walletChallenge(address, NETWORK);
  const signedXdr = await signTransaction(challengeXdr);
  await api.verifyWallet(address, signedXdr);
}
