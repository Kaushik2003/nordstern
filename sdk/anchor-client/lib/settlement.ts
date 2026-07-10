import * as Freighter from '@/lib/freighter';
import { sep10Challenge, sep10Submit } from '@/lib/api';

// ── Settlement seam (future-proof) ──────────────────────────────────────────────
// Blockchain settlement needs the destination wallet to authorise the transfer. Today
// that is the CUSTOMER'S OWN wallet (self-custodial) — presented in the UI as a "secure
// confirmation", never as SEP-10/Stellar. A future Managed Wallet Service can implement
// this SAME interface server-side (provisioning + signing on the customer's behalf after
// KYC) so the Buy/Sell screens never change. Swap `settler` and the UI is untouched.

export interface SettlementSession {
  walletAddress: string;
  token: string; // opaque anchor session used to move money for this wallet
}

export interface Settler {
  readonly kind: 'self-custodial' | 'managed';
  /** Connect a wallet the customer controls; resolves to its address. */
  connect(): Promise<string>;
  /** True if a wallet is already available without a prompt. */
  available(): Promise<string | null>;
  /** Authorise a settlement for a wallet (the "secure confirmation" step). */
  authorize(walletAddress: string): Promise<SettlementSession>;
}

// Self-custodial: the customer's wallet extension signs. All blockchain wording is hidden;
// the caller shows "Confirm securely in your wallet".
const selfCustodialSettler: Settler = {
  kind: 'self-custodial',
  connect: () => Freighter.connect(),
  available: () => Freighter.checkConnected(),
  async authorize(walletAddress: string): Promise<SettlementSession> {
    const challenge = await sep10Challenge(walletAddress);
    const signed = await Freighter.signTransaction(challenge); // the secure confirmation
    const token = await sep10Submit(signed);
    return { walletAddress, token };
  },
};

// The active settler. Replace with a ManagedWalletSettler later — nothing else changes.
export const settler: Settler = selfCustodialSettler;
