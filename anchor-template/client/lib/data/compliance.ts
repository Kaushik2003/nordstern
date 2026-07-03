import { fakerEN_IN as faker } from "@faker-js/faker";
import { users, NOW, DAY } from "./store";
import type { AppUser } from "./types";

faker.seed(29);

/** Tiny deterministic hash → 16 hex chars (visual hash-chain, not cryptographic). */
function hashHex(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < str.length; i++) {
    h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + str.charCodeAt(i) * 31, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 16);
}

export type CaseStatus = "open" | "in_review" | "cleared" | "reported";
export interface ComplianceCase {
  id: string;
  user: AppUser;
  reason: string;
  severity: "low" | "med" | "high";
  assignee: string;
  status: CaseStatus;
  at: number;
  amount: number;
  relatedTx: number;
  note: string;
}

const REASONS = [
  "Large single deposit > ₹2,00,000",
  "Velocity spike — 5× the 7-day average",
  "Structuring pattern — repeated ₹49,000 deposits",
  "Sanctions watchlist near-match",
  "Rapid in-out cycling within 10 minutes",
  "New device + new IP + high value",
];
const ASSIGNEES = ["Ananya Rao", "Imran Sheikh", "Unassigned", "Kavya Nair"];

const flagged = users.filter((u) => u.status === "flagged" || u.risk === "high");
const pool = flagged.length >= 10 ? flagged : [...flagged, ...users.filter((u) => u.risk === "med")];

export const cases: ComplianceCase[] = Array.from({ length: 11 }, (_, i) => {
  const u = pool[i % pool.length];
  const r = faker.number.float();
  const status: CaseStatus = i === 0 ? "open" : r < 0.4 ? "open" : r < 0.65 ? "in_review" : r < 0.88 ? "cleared" : "reported";
  const severity = faker.helpers.arrayElement(["high", "high", "med", "low"] as const);
  return {
    id: "CASE-" + (4120 - i),
    user: u,
    reason: faker.helpers.arrayElement(REASONS),
    severity,
    assignee: faker.helpers.arrayElement(ASSIGNEES),
    status,
    at: NOW - i * 0.6 * DAY - faker.number.float() * DAY,
    amount: Math.round((90_000 + faker.number.float() * 800_000) / 100) * 100,
    relatedTx: 2 + Math.floor(faker.number.float() * 9),
    note: faker.helpers.arrayElement([
      "Awaiting source-of-funds documentation.",
      "Pattern consistent with payroll disbursement — likely benign.",
      "Escalated to MLRO for review.",
      "Cleared after EDD; counterparty verified.",
    ]),
  };
});

export interface SanctionMatch {
  id: string;
  name: string;
  list: string;
  confidence: number;
  status: "pending" | "cleared" | "confirmed";
}
export const sanctions: SanctionMatch[] = [
  { id: "s1", name: "V. Ramaswamy", list: "OFAC SDN", confidence: 62, status: "pending" },
  { id: "s2", name: "A. Khan Trading FZE", list: "UN Consolidated", confidence: 48, status: "cleared" },
  { id: "s3", name: "Sunrise Exports Ltd", list: "EU Sanctions", confidence: 71, status: "pending" },
];

export interface Str {
  id: string;
  ref: string;
  subject: string;
  at: number;
  status: "submitted" | "draft";
}
export const strs: Str[] = [
  { id: "str1", ref: "FIU-STR-2026-004417", subject: "CASE-4109", at: NOW - 6 * DAY, status: "submitted" },
  { id: "str2", ref: "FIU-STR-2026-004390", subject: "CASE-4101", at: NOW - 14 * DAY, status: "submitted" },
];

export interface MonitoringRule {
  id: string;
  name: string;
  definition: string;
  enabled: boolean;
  hits: number;
}
export const monitoringRules: MonitoringRule[] = [
  { id: "r1", name: "Large deposit", definition: "Single deposit > ₹2,00,000", enabled: true, hits: 38 },
  { id: "r2", name: "Velocity", definition: "≥5 deposits/hour from one user", enabled: true, hits: 12 },
  { id: "r3", name: "Structuring", definition: "≥3 deposits of ₹45k–₹50k in 24h", enabled: true, hits: 7 },
  { id: "r4", name: "Dormant reactivation", definition: "First tx after 90+ days idle > ₹1,00,000", enabled: false, hits: 3 },
  { id: "r5", name: "Cross-border", definition: "Inbound corridor outside India", enabled: true, hits: 21 },
];

const ACTIONS = [
  { actor: "system", action: "mint.completed", detail: "INRT minted · ₹2,000" },
  { actor: "system", action: "burn.detected", detail: "INRT burn · ₹500" },
  { actor: "system", action: "payout.settled", detail: "UPI payout settled · UTR" },
  { actor: "Priya Menon", action: "withdrawal.initiated", detail: "₹54,200 → Acme Pay ••6642" },
  { actor: "Imran Sheikh", action: "case.cleared", detail: "CASE-4118 cleared after EDD" },
  { actor: "Ananya Rao", action: "str.filed", detail: "FIU-STR-2026-004417" },
  { actor: "Priya Menon", action: "pricing.updated", detail: "off-ramp spread 1.50% → 1.40%" },
  { actor: "system", action: "kyc.approved", detail: "T2 upgrade · match 0.97" },
  { actor: "Dev Kapoor", action: "apikey.rolled", detail: "Production server key rotated" },
  { actor: "system", action: "reserve.attested", detail: "ratio 102.4% · hash-chained" },
];

export interface AuditEntry {
  seq: number;
  at: number;
  actor: string;
  action: string;
  detail: string;
  prevHash: string;
  hash: string;
}

export const auditLog: AuditEntry[] = (() => {
  const out: AuditEntry[] = [];
  let prev = "0000000000000000";
  const n = 52;
  for (let i = 0; i < n; i++) {
    const a = ACTIONS[i % ACTIONS.length];
    const at = NOW - (n - i) * 11 * 60_000 - faker.number.float() * 60_000;
    const hash = hashHex(prev + i + a.action + a.detail + Math.floor(at));
    out.push({ seq: i + 1, at, actor: a.actor, action: a.action, detail: a.detail, prevHash: prev, hash });
    prev = hash;
  }
  return out.reverse(); // newest first
})();

export const COMPLIANCE_KPIS = {
  openCases: cases.filter((c) => c.status === "open" || c.status === "in_review").length,
  sanctionsHits24h: 2,
  strsMTD: strs.length,
  travelRuleCoverage: 96.4,
};

export { hashHex };
