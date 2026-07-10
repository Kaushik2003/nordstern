'use client';

// Multi-wallet connector backed by Stellar Wallets Kit. Replaces the Freighter-only
// integration: the customer can connect Freighter, xBull, Albedo, Lobstr, Rabet, or Hana
// (no forced browser extension), and mobile via QR where supported. The exported surface
// (connect / checkConnected / signTransaction) is unchanged, so the settlement seam
// (lib/settlement.ts) and the buy/sell flows are untouched.
//
// The kit renders a web-component modal and touches window/customElements, so everything is
// browser-only and lazily initialised (never at module load / on the server).

import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr';
import { RabetModule } from '@creit.tech/stellar-wallets-kit/modules/rabet';
import { HanaModule } from '@creit.tech/stellar-wallets-kit/modules/hana';

const NET_PASS = process.env.NEXT_PUBLIC_NET_PASS ?? 'Test SDF Network ; September 2015';
const NETWORK = NET_PASS.includes('Public Global') ? Networks.PUBLIC : Networks.TESTNET;
// Remember which wallet the customer picked so we can silently reconnect on the next visit.
const LS_KEY = 'ns:walletId';

let inited = false;
function ensureKit(): void {
  if (typeof window === 'undefined') throw new Error('Not a browser environment');
  if (inited) return;
  StellarWalletsKit.init({
    network: NETWORK,
    selectedWalletId: window.localStorage.getItem(LS_KEY) ?? undefined,
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
    ],
  });
  inited = true;
}

// Opens the wallet-picker modal, sets the chosen wallet active, and returns its address.
export async function connect(): Promise<string> {
  ensureKit();
  const { address } = await StellarWalletsKit.authModal();
  if (!address) throw new Error('Connection cancelled');
  try {
    const id = StellarWalletsKit.selectedModule?.productId;
    if (id) window.localStorage.setItem(LS_KEY, id);
  } catch {
    /* persistence is best-effort */
  }
  return address;
}

// Returns the address if a wallet is already connected (no prompt), else null.
export async function checkConnected(): Promise<string | null> {
  try {
    if (typeof window === 'undefined' || !window.localStorage.getItem(LS_KEY)) return null;
    ensureKit();
    const { address } = await StellarWalletsKit.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// Signs an XDR transaction with the connected wallet. Rejects if the user declines.
export async function signTransaction(xdr: string): Promise<string> {
  ensureKit();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, { networkPassphrase: NET_PASS });
  return signedTxXdr;
}

// Forget the connected wallet (used by a "disconnect" affordance).
export async function disconnect(): Promise<void> {
  try {
    ensureKit();
    await StellarWalletsKit.disconnect();
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.localStorage.removeItem(LS_KEY);
}
