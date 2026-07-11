'use client';

// Prove-then-link a wallet to the central NordStern identity (Identity Phase 1).
// A wallet is attached only after the customer signs a server-issued challenge — never by
// asserting an address. Shared by the Profile "connect & verify" action and the buy/sell
// money paths (where linking is best-effort: it enables cross-anchor KYC reuse and scopes
// the customer's transaction history, but a decline never blocks the payment itself).

import { customer as api } from './customer';
import { signTransaction, walletNetworkLabel } from './wallet';

// Ensure `address` is a proven, linked wallet. No-op (and no signature prompt) if it is
// already linked. Otherwise runs challenge → sign → verify. Throws on failure/decline so the
// caller can decide whether it's fatal (Profile) or best-effort (buy/sell).
export async function ensureWalletLinked(address: string): Promise<void> {
  const linked = await api.wallets().catch(() => []);
  if (linked.some((w) => w.address === address)) return;
  // Runtime network (set from the brand passphrase), so the challenge matches the anchor's net.
  const { challengeXdr } = await api.walletChallenge(address, walletNetworkLabel());
  const signedXdr = await signTransaction(challengeXdr);
  await api.verifyWallet(address, signedXdr);
}
