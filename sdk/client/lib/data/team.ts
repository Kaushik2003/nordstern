import { fakerEN_IN as faker } from "@faker-js/faker";
import { NOW, HOUR } from "./store";

faker.seed(91);

export type Role = "Admin" | "Finance" | "Compliance" | "Developer" | "Viewer";

export interface Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  lastActive: number;
  pending?: boolean;
}

function ini(name: string) {
  const p = name.split(" ");
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export const team: Member[] = [
  { name: "Priya Menon", role: "Admin", h: 0.3 },
  { name: "Rohan Desai", role: "Finance", h: 2 },
  { name: "Ananya Rao", role: "Compliance", h: 0.8 },
  { name: "Imran Sheikh", role: "Compliance", h: 5 },
  { name: "Dev Kapoor", role: "Developer", h: 1.2 },
  { name: "Sana Iqbal", role: "Viewer", h: 26, pending: true },
].map((m) => ({
  id: faker.string.alphanumeric(8),
  name: m.name,
  initials: ini(m.name),
  email: `${m.name.split(" ")[0].toLowerCase()}@acmepay.in`,
  role: m.role as Role,
  lastActive: NOW - m.h * HOUR,
  pending: m.pending,
}));

export const ROLES: Role[] = ["Admin", "Finance", "Compliance", "Developer", "Viewer"];

export const PERMISSIONS = [
  { label: "Withdraw funds", grants: { Admin: true, Finance: true, Compliance: false, Developer: false, Viewer: false } },
  { label: "Change pricing", grants: { Admin: true, Finance: true, Compliance: false, Developer: false, Viewer: false } },
  { label: "Resolve cases", grants: { Admin: true, Finance: false, Compliance: true, Developer: false, Viewer: false } },
  { label: "File STRs", grants: { Admin: true, Finance: false, Compliance: true, Developer: false, Viewer: false } },
  { label: "Manage API keys", grants: { Admin: true, Finance: false, Compliance: false, Developer: true, Viewer: false } },
  { label: "Invite members", grants: { Admin: true, Finance: false, Compliance: false, Developer: false, Viewer: false } },
  { label: "View dashboards", grants: { Admin: true, Finance: true, Compliance: true, Developer: true, Viewer: true } },
] as const;

export interface BankAccount {
  id: string;
  bank: string;
  masked: string;
  ifsc: string;
  primary: boolean;
}

export const bankAccounts: BankAccount[] = [
  { id: "b1", bank: "HDFC Bank · Current", masked: "••6642", ifsc: "HDFC0001234", primary: true },
  { id: "b2", bank: "ICICI Bank · Escrow", masked: "••0918", ifsc: "ICIC0000456", primary: false },
];

export const activityLog = [
  { actor: "Priya Menon", action: "withdrew ₹54,200 to ••6642", h: 0.5 },
  { actor: "Rohan Desai", action: "changed off-ramp spread to 1.40%", h: 3 },
  { actor: "Ananya Rao", action: "cleared CASE-4118", h: 6 },
  { actor: "Dev Kapoor", action: "rolled the Production server key", h: 14 },
  { actor: "Priya Menon", action: "invited sana@acmepay.in as Viewer", h: 26 },
].map((a) => ({ ...a, at: NOW - a.h * HOUR, initials: ini(a.actor) }));

export const NOTIFICATION_CHANNELS = [
  { label: "Reserve alerts", desc: "Backing ratio drifts below threshold", email: true, slack: true, inApp: true },
  { label: "Large withdrawals", desc: "Outgoing payout above ₹1,00,000", email: true, slack: false, inApp: true },
  { label: "Failed payouts", desc: "Any payout that fails to settle", email: true, slack: true, inApp: true },
  { label: "New compliance cases", desc: "A monitoring rule opens a case", email: false, slack: true, inApp: true },
];
