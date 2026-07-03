import type { Tx } from "./types";

export type HopState = "done" | "active" | "pending" | "failed";
export interface Hop {
  label: string;
  sub?: string;
  at?: number;
  state: HopState;
  ref?: string;
  refLabel?: string;
  href?: string;
}

const EXPLORER = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;

/** Build the lifecycle timeline for a transaction (PRD §4.2 drawer). */
export function buildHops(tx: Tx): Hop[] {
  const t0 = tx.createdAt;
  const step = Math.max(8_000, (tx.updatedAt - tx.createdAt) / 5);
  const at = (i: number) => t0 + step * i;

  if (tx.dir === "in") {
    const labels = [
      { label: "SEP-10 authentication", sub: "Challenge signed & verified" },
      { label: "KYC verified", sub: "Hyperverge · liveness ✓" },
      { label: "₹ payment captured", sub: "RazorpayX", ref: tx.razorpayRef, refLabel: "Razorpay ref" },
      { label: "INRT minted", sub: "Stellar payment", ref: tx.hash, refLabel: "Stellar tx", href: EXPLORER(tx.hash) },
      { label: "Credited to user wallet", sub: "Available to spend" },
    ];
    const cut = tx.status === "settled" ? 5 : tx.status === "minting" ? 3 : tx.status === "received" || tx.status === "pending" ? 2 : tx.status === "failed" ? 3 : 4;
    return labels.map((l, i) => ({
      ...l,
      at: i < cut ? at(i) : undefined,
      state: failState(tx, i, cut),
    }));
  }

  const labels = [
    { label: "INRT burn detected", sub: "Stellar payment", ref: tx.hash, refLabel: "Stellar tx", href: EXPLORER(tx.hash) },
    { label: "Payout queued", sub: "RazorpayX payout" },
    { label: "UPI transfer", sub: "IMPS / UPI", ref: tx.utr, refLabel: "UTR" },
    { label: "Settled to bank", sub: "Beneficiary credited" },
  ];
  const cut = tx.status === "settled" ? 4 : tx.status === "payout" ? 2 : tx.status === "burning" || tx.status === "pending" ? 1 : tx.status === "failed" ? 2 : 3;
  return labels.map((l, i) => ({
    ...l,
    at: i < cut ? at(i) : undefined,
    state: failState(tx, i, cut),
  }));
}

function failState(tx: Tx, i: number, cut: number): HopState {
  if (tx.status === "failed") {
    if (i < cut - 1) return "done";
    if (i === cut - 1) return "failed";
    return "pending";
  }
  if (i < cut - 1) return "done";
  if (i === cut - 1) return tx.status === "settled" ? "done" : "active";
  return "pending";
}
