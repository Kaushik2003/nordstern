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

// The wallet network is RUNTIME, not build-time: a single shared image serves both testnet and
// mainnet anchors, so NEXT_PUBLIC_* can't carry it. The app calls setWalletNetwork() with the
// anchor's real passphrase (from the brand context) before any wallet interaction; until then we
// default to testnet. Signing with the wrong network makes the wallet (e.g. Freighter) reject
// the transaction ("set to Main Net, transaction is on Test Net").
let NET_PASS = process.env.NEXT_PUBLIC_NET_PASS ?? 'Test SDF Network ; September 2015';

/** Configure the wallet network at runtime (call once, from the brand provider). */
export function setWalletNetwork(passphrase: string): void {
  if (passphrase && passphrase !== NET_PASS) {
    NET_PASS = passphrase;
    inited = false; // re-init the kit against the new network on next use
  }
}
/** 'mainnet' | 'testnet' for the currently configured wallet network. */
export function walletNetworkLabel(): 'mainnet' | 'testnet' {
  return NET_PASS.includes('Public Global') ? 'mainnet' : 'testnet';
}
// Remember which wallet the customer picked so we can silently reconnect on the next visit.
const LS_KEY = 'ns:walletId';

let inited = false;
function ensureKit(): void {
  if (typeof window === 'undefined') throw new Error('Not a browser environment');
  if (inited) return;
  StellarWalletsKit.init({
    network: NET_PASS.includes('Public Global') ? Networks.PUBLIC : Networks.TESTNET,
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

// The address for a connection ESTABLISHED this session via connect() (the auth modal). We
// gate checkConnected() on this — not on getAddress() — because a wallet like Freighter will
// hand back a cached public key even for a site it has never been granted access to. Signing
// then fails ("site not connected", Confirm disabled) because connect() → authModal is what
// runs the wallet's requestAccess/allowlist. Requiring a real connect() per session guarantees
// the site is allowlisted before we ever ask it to sign.
let establishedAddress: string | null = null;

// Opens the wallet-picker modal, sets the chosen wallet active, and returns its address.
// authModal() triggers the wallet's access grant (e.g. Freighter requestAccess), which
// allowlists this site so subsequent signTransaction calls are permitted.
export async function connect(): Promise<string> {
  ensureKit();
  const { address } = await StellarWalletsKit.authModal();
  if (!address) throw new Error('Connection cancelled');
  establishedAddress = address;
  try {
    const id = StellarWalletsKit.selectedModule?.productId;
    if (id) window.localStorage.setItem(LS_KEY, id);
  } catch {
    /* persistence is best-effort */
  }
  return address;
}

// Returns the address only if a wallet was actually connected this session (no prompt),
// else null so the caller falls through to connect() and establishes a real, allowlisted
// connection. Deliberately does NOT fall back to getAddress() (see establishedAddress note).
export async function checkConnected(): Promise<string | null> {
  return establishedAddress;
}

// Signs an XDR transaction with the connected wallet. Rejects if the user declines.
export async function signTransaction(xdr: string): Promise<string> {
  ensureKit();
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, { networkPassphrase: NET_PASS });
  return signedTxXdr;
}

// Forget the connected wallet (used by a "disconnect" affordance).
export async function disconnect(): Promise<void> {
  establishedAddress = null;
  try {
    ensureKit();
    await StellarWalletsKit.disconnect();
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.localStorage.removeItem(LS_KEY);
}
