import { Horizon } from '@stellar/stellar-sdk';
import {
  HORIZON_URL, TREASURY_PUBLIC, ASSET_CODE, ASSET_ISSUER_PUBLIC,
} from './config.js';

// ─── Stellar helpers ───────────────────────────────────────────────────────────
// Phase A only needs to read the treasury and derive memos. The actual USDC
// transfer (deposit) and withdrawal detection land in Phases B/C.

const horizon = new Horizon.Server(HORIZON_URL);

// Deterministic memo derived from the transaction id. On withdrawal the Platform
// stores it and the Observer matches the incoming USDC payment by it.
export function generateMemo(transactionId: string): string {
  return transactionId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

// The anchor's USDC float. Returns the balance string, '0' if the trustline exists
// but is empty, or null if the treasury isn't set / has no USDC trustline.
export async function getTreasuryUsdcBalance(): Promise<string | null> {
  if (!TREASURY_PUBLIC) return null;
  const account = await horizon.loadAccount(TREASURY_PUBLIC);
  const bal = account.balances.find(
    (b: any) => b.asset_code === ASSET_CODE && b.asset_issuer === ASSET_ISSUER_PUBLIC,
  );
  return bal ? bal.balance : null;
}
