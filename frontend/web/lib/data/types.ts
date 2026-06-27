/* Domain types for the NordStern synthetic dataset. */

export type Direction = "in" | "out";
export type TxType = "deposit" | "withdraw";
/** deposit: received → minting → settled · withdraw: burning → payout → settled (or failed) */
export type TxStatus =
  | "received"
  | "minting"
  | "burning"
  | "payout"
  | "settled"
  | "pending"
  | "failed";

export type KycTier = "T0" | "T1" | "T2";
export type KycStatus = "verified" | "pending" | "rejected" | "flagged";
export type Risk = "low" | "med" | "high";

export interface GeoNode {
  name: string;
  state: string;
  lat: number;
  lng: number;
  weight: number;
  intl?: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  tier: KycTier;
  status: KycStatus;
  city: string;
  state: string;
  lat: number;
  lng: number;
  lifetimeVolume: number;
  txCount: number;
  lastSeen: number;
  joined: number;
  risk: Risk;
  riskFactors: string[];
  address: string;
  matchScore: number;
  source: string;
  verifiedAcross: number;
}

export interface Tx {
  id: string;
  hash: string;
  dir: Direction;
  type: TxType;
  status: TxStatus;
  userId: string;
  userName: string;
  userInitials: string;
  amount: number;
  fee: number;
  spreadFee: number;
  flatFee: number;
  networkFee: number;
  corridor: string;
  createdAt: number;
  updatedAt: number;
  city: string;
  state: string;
  lat: number;
  lng: number;
  source: string;
  utr?: string;
  razorpayRef?: string;
  failureReason?: string;
}

export type TapeEvent =
  | { id: string; at: number; kind: "tx"; tx: Tx }
  | { id: string; at: number; kind: "kyc"; userName: string; initials: string; tier: KycTier }
  | { id: string; at: number; kind: "alert"; severity: "warn" | "crit"; message: string };

export interface SeriesPoint {
  t: number;
  in: number;
  out: number;
  volume: number;
  fees: number;
  spread: number;
  yield: number;
}

export interface WithdrawalRecord {
  id: string;
  at: number;
  amount: number;
  account: string;
  utr: string;
  status: "settled" | "processing" | "failed";
}
