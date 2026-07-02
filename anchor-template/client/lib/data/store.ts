import { fakerEN_IN as faker } from "@faker-js/faker";
import { pickCity } from "./geo";
import type {
  AppUser,
  KycStatus,
  KycTier,
  Risk,
  SeriesPoint,
  Tx,
  TxStatus,
  WithdrawalRecord,
} from "./types";

/* ============================================================
   Deterministic synthetic dataset. Seeded so the demo is
   reproducible. All figures internally consistent with the
   canonical org "Acme Pay" / asset "INRT".  (PRD §6)
   ============================================================ */

faker.seed(73);
const NOW = Date.now();
const DAY = 86_400_000;
const HOUR = 3_600_000;

export const ORG = {
  name: "Acme Pay",
  asset: "INRT",
  issuer: "GA3FQX9QZ7KXTG2YVDPHL4E5N6MWA91FB3RC8DUSPHANTOM7XK2Z9QLMN",
  homeDomain: "acmepay.in",
  env: "testnet" as const,
};

const base32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function stellarAddr(): string {
  let s = "G";
  for (let i = 0; i < 55; i++) s += base32[Math.floor(faker.number.float() * 32)];
  return s;
}
function txHash(): string {
  let s = "";
  for (let i = 0; i < 64; i++) s += "0123456789abcdef"[Math.floor(faker.number.float() * 16)];
  return s;
}
function utr(): string {
  let s = "";
  for (let i = 0; i < 12; i++) s += Math.floor(faker.number.float() * 10);
  return s;
}
function razorpayRef(): string {
  let s = "pay_";
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 14; i++) s += c[Math.floor(faker.number.float() * c.length)];
  return s;
}
function initials(name: string): string {
  const p = name.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

const TICKETS = [500, 1000, 2000, 5000, 10000];
const TICKET_W = [28, 26, 22, 14, 7];
function ticket(): number {
  const total = TICKET_W.reduce((a, b) => a + b, 0);
  let r = faker.number.float() * total;
  for (let i = 0; i < TICKETS.length; i++) {
    r -= TICKET_W[i];
    if (r <= 0) {
      const jitter = 1 + (faker.number.float() - 0.5) * 0.12;
      return Math.round((TICKETS[i] * jitter) / 10) * 10;
    }
  }
  // long tail
  return Math.round((15000 + faker.number.float() * 60000) / 100) * 100;
}

const SOURCES = ["Lobstr", "Vibrant", "Beans", "Direct API", "Keybase"];
const SOURCE_W = [42, 22, 14, 16, 6];
function source(): string {
  const total = SOURCE_W.reduce((a, b) => a + b, 0);
  let r = faker.number.float() * total;
  for (let i = 0; i < SOURCES.length; i++) {
    r -= SOURCE_W[i];
    if (r <= 0) return SOURCES[i];
  }
  return SOURCES[0];
}

const RISK_FACTORS = [
  "Velocity spike (5× 7d avg)",
  "Large single deposit > ₹2,00,000",
  "New device + new IP",
  "Structuring pattern detected",
  "Cross-border corridor",
  "PEP near-match",
  "Rapid in-out cycling",
];

function tier(): KycTier {
  const r = faker.number.float();
  if (r < 0.12) return "T0";
  if (r < 0.62) return "T1";
  return "T2";
}
function status(): KycStatus {
  const r = faker.number.float();
  if (r < 0.85) return "verified";
  if (r < 0.94) return "pending";
  if (r < 0.985) return "rejected";
  return "flagged";
}

/* ---- Users ---- */
const USER_POOL = 520;
export const users: AppUser[] = Array.from({ length: USER_POOL }, () => {
  const name = faker.person.fullName();
  const city = pickCity(faker.number.float());
  const st = status();
  // log-normal lifetime volume → most small, a few whales
  const lv = Math.round(Math.exp(faker.number.float() * 4 + 8) / 10) * 10;
  const risk: Risk =
    st === "flagged"
      ? "high"
      : faker.number.float() < 0.04
        ? "med"
        : faker.number.float() < 0.012
          ? "high"
          : "low";
  return {
    id: faker.string.alphanumeric(10),
    name,
    initials: initials(name),
    tier: tier(),
    status: st,
    city: city.name,
    state: city.state,
    lat: city.lat,
    lng: city.lng,
    lifetimeVolume: lv,
    txCount: Math.max(0, Math.round((lv / 4200) * (0.6 + faker.number.float()))),
    lastSeen: NOW - Math.floor(faker.number.float() ** 2 * 8 * DAY),
    joined: NOW - Math.floor((0.2 + faker.number.float()) * 400 * DAY),
    risk,
    riskFactors:
      risk === "low"
        ? []
        : faker.helpers.arrayElements(RISK_FACTORS, risk === "high" ? 3 : 1),
    address: stellarAddr(),
    matchScore: 84 + Math.floor(faker.number.float() * 16),
    source: source(),
    verifiedAcross: faker.number.float() < 0.35 ? 1 + Math.floor(faker.number.float() * 4) : 1,
  };
}).sort((a, b) => b.lifetimeVolume - a.lifetimeVolume);

/* ---- Pricing (drives fee derivation) ---- */
export const PRICING = {
  onramp: { current: 1.1, rec: 0.9, market: 1.05, min: 0.4, max: 2.5 },
  offramp: { current: 1.5, rec: 1.4, market: 1.55, min: 0.6, max: 3.0 },
  flatFee: 8,
};

function feeFor(amount: number, dir: "in" | "out") {
  const spreadPct = (dir === "in" ? PRICING.onramp.current : PRICING.offramp.current) / 100;
  const spreadFee = Math.round(amount * spreadPct);
  const flatFee = PRICING.flatFee;
  const networkFee = dir === "in" ? 0 : 1;
  return { spreadFee, flatFee, networkFee, fee: spreadFee + flatFee + networkFee };
}

/* ---- Transactions: ~30d history ---- */
function makeTx(at: number, opts?: { forceStatus?: TxStatus; recent?: boolean }): Tx {
  const u = users[Math.floor(faker.number.float() ** 1.6 * users.length)];
  const dir = faker.number.float() < 0.62 ? "in" : "out";
  const type: Tx["type"] = dir === "in" ? "deposit" : "withdraw";
  const amount = ticket();
  const f = feeFor(amount, dir);
  let st: TxStatus = opts?.forceStatus ?? "settled";
  if (!opts?.forceStatus) {
    const r = faker.number.float();
    if (opts?.recent) {
      if (r < 0.55) st = "settled";
      else if (r < 0.78) st = dir === "in" ? "minting" : "payout";
      else if (r < 0.9) st = dir === "in" ? "received" : "burning";
      else if (r < 0.965) st = "pending";
      else st = "failed";
    } else {
      st = r < 0.985 ? "settled" : "failed";
    }
  }
  const failed = st === "failed";
  return {
    id: faker.string.alphanumeric(12),
    hash: txHash(),
    dir,
    type,
    status: st,
    userId: u.id,
    userName: u.name,
    userInitials: u.initials,
    amount,
    fee: f.fee,
    spreadFee: f.spreadFee,
    flatFee: f.flatFee,
    networkFee: f.networkFee,
    corridor: dir === "in" ? "INR → INRT" : "INRT → INR",
    createdAt: at,
    updatedAt: at + Math.floor(faker.number.float() * 90_000),
    city: u.city,
    state: u.state,
    lat: u.lat,
    lng: u.lng,
    source: u.source,
    utr: dir === "out" && (st === "settled" || st === "payout") ? utr() : undefined,
    razorpayRef: dir === "in" ? razorpayRef() : undefined,
    failureReason: failed
      ? faker.helpers.arrayElement([
          "Beneficiary bank unreachable",
          "UPI deadline exceeded",
          "Insufficient payout balance",
          "VPA validation failed",
        ])
      : undefined,
  };
}

/** A fresh, in-flight transaction stamped "now" — used by the live engine. */
export function liveTx(at = Date.now()): Tx {
  return makeTx(at, { recent: true });
}

const HISTORY_COUNT = 540;
export const transactions: Tx[] = Array.from({ length: HISTORY_COUNT }, (_, i) => {
  const recent = i < 26;
  const ageDays = recent ? faker.number.float() * 0.5 : faker.number.float() ** 1.4 * 30;
  return makeTx(NOW - ageDays * DAY, { recent });
}).sort((a, b) => b.createdAt - a.createdAt);

/* ---- 30-day daily series with seasonality ---- */
export const series: SeriesPoint[] = (() => {
  const pts: SeriesPoint[] = [];
  for (let d = 29; d >= 0; d--) {
    const t = NOW - d * DAY;
    const date = new Date(t);
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6 ? 0.72 : 1;
    const trend = 1 + (29 - d) * 0.012; // gentle uptrend
    const noise = 0.82 + faker.number.float() * 0.36;
    const inV = Math.round(900_000 * weekend * trend * noise);
    const outV = Math.round(560_000 * weekend * trend * (0.82 + faker.number.float() * 0.36));
    const volume = inV + outV;
    const spread = Math.round(volume * 0.0118);
    const fees = Math.round((inV / 1500 + outV / 1500) * 8);
    const yld = Math.round(2400 * trend * (0.8 + faker.number.float() * 0.4));
    pts.push({ t, in: inV, out: outV, volume, fees, spread, yield: yld });
  }
  return pts;
})();

/* ---- 30-day realized volatility series (justifies spread recs) ---- */
export const volSeries: { t: number; inr: number; usdc: number }[] = Array.from(
  { length: 30 },
  (_, i) => {
    const t = NOW - (29 - i) * DAY;
    const base = 0.6 + Math.sin(i / 4) * 0.2;
    return {
      t,
      inr: +(base * (0.8 + faker.number.float() * 0.4)).toFixed(2),
      usdc: +((base + (i > 22 ? (i - 22) * 0.18 : 0)) * (0.9 + faker.number.float() * 0.5)).toFixed(2),
    };
  },
);

/* ---- Canonical treasury figures (PRD §6) ---- */
export const TREASURY = {
  available: 54_200,
  pending: 8_450,
  pendingCount: 12,
  lifetimeVolume: 4.82e7,
  earned30d: 1_24_300,
  earned30dDelta: 8.4,
  tokensIssued: 1_02_40_000,
  reserves: 1_04_80_000,
  get ratio() {
    return (this.reserves / this.tokensIssued) * 100;
  },
  lastVerified: NOW - 32 * 60_000,
  // tiers — only the excess above 1:1 is deployable
  tiers: {
    hot: { amount: 35_00_000, yield: 0, settle: "instant", note: "Never touched" },
    warm: { amount: 67_40_000, yield: 6.8, settle: "T+1", note: "T-bills / liquid funds" },
    deployable: { amount: 2_40_000, yield: 11.2, settle: "T+2", note: "Profit & excess only · cross-chain" },
  },
};

/* ---- Two-sided liquidity (Overview) ---- */
export const LIQUIDITY = {
  fiat: { pct: 78, label: "Fiat", hours: 9.5, target: 70_00_000 },
  usdc: { pct: 31, label: "USDC", hours: 2.1, low: true, target: 40_00_000 },
};

export const ACTIVE_USERS = 12_480;
export const ACTIVE_USERS_DELTA = 4.1;
export const NEW_TODAY = 214;

/* ---- KYC funnel (PRD §4.5) ---- */
export const KYC_FUNNEL = [
  { label: "Started", value: 14_210 },
  { label: "Document", value: 12_980 },
  { label: "Face match", value: 12_440 },
  { label: "Verified", value: 12_110 },
];

/* ---- Withdrawal history (Treasury) ---- */
export const withdrawals: WithdrawalRecord[] = Array.from({ length: 9 }, (_, i) => {
  const at = NOW - (i * 2 + faker.number.float() * 2) * DAY;
  const amount = Math.round((20_000 + faker.number.float() * 60_000) / 100) * 100;
  return {
    id: faker.string.alphanumeric(10),
    at,
    amount,
    account: "Acme Pay ••6642",
    utr: utr(),
    status: i === 0 ? "settled" : faker.number.float() < 0.92 ? "settled" : "failed",
  } as WithdrawalRecord;
}).sort((a, b) => b.at - a.at);

/* ---- Derived 24h aggregates ---- */
export function flows24h() {
  const cutoff = NOW - DAY;
  let inV = 0,
    outV = 0,
    inC = 0,
    outC = 0;
  for (const t of transactions) {
    if (t.createdAt < cutoff || t.status === "failed") continue;
    if (t.dir === "in") {
      inV += t.amount;
      inC++;
    } else {
      outV += t.amount;
      outC++;
    }
  }
  return { in: inV, out: outV, net: inV - outV, inCount: inC, outCount: outC };
}

export const totalVolume30d = series.reduce((s, p) => s + p.volume, 0);
export const volumeDelta30d = 18.2;

export { NOW, DAY, HOUR };
