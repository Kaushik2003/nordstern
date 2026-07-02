import { fakerEN_IN as faker } from "@faker-js/faker";
import { ORG, NOW, DAY, HOUR } from "./store";

faker.seed(11);

export interface ApiKey {
  id: string;
  name: string;
  masked: string;
  secret: string;
  scopes: string[];
  created: number;
  lastUsed: number;
  live: boolean;
}

function keySecret(live: boolean) {
  const env = live ? "live" : "test";
  let body = "";
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) body += c[Math.floor(faker.number.float() * c.length)];
  return `sk_${env}_${body}`;
}

export const apiKeys: ApiKey[] = [
  { name: "Production server", scopes: ["read", "write", "payouts"], live: true, ageD: 142, usedH: 0.2 },
  { name: "Webhooks worker", scopes: ["read", "webhooks"], live: true, ageD: 88, usedH: 1.4 },
  { name: "Sandbox / CI", scopes: ["read", "write"], live: false, ageD: 30, usedH: 18 },
].map((k) => {
  const secret = keySecret(k.live);
  return {
    id: faker.string.alphanumeric(10),
    name: k.name,
    secret,
    masked: `${secret.slice(0, 11)}${"•".repeat(18)}${secret.slice(-4)}`,
    scopes: k.scopes,
    created: NOW - k.ageD * DAY,
    lastUsed: NOW - k.usedH * HOUR,
    live: k.live,
  };
});

export const WEBHOOK_EVENTS = ["payment.captured", "mint.completed", "burn.detected", "payout.settled", "kyc.updated"];

export interface Delivery {
  id: string;
  event: string;
  status: number;
  at: number;
  attempts: number;
  ms: number;
}

export const deliveries: Delivery[] = Array.from({ length: 52 }, (_, i) => {
  const r = faker.number.float();
  const status = r < 0.88 ? 200 : r < 0.95 ? 400 : r < 0.98 ? 500 : 429;
  return {
    id: faker.string.alphanumeric(12),
    event: faker.helpers.arrayElement(WEBHOOK_EVENTS),
    status,
    at: NOW - i * (HOUR * 0.7) - faker.number.float() * HOUR,
    attempts: status === 200 ? 1 : 1 + Math.floor(faker.number.float() * 3),
    ms: Math.round(40 + faker.number.float() * 380),
  };
}).sort((a, b) => b.at - a.at);

export const samplePayload = (event: string) =>
  JSON.stringify(
    {
      id: "evt_" + faker.string.alphanumeric(16),
      type: event,
      created: Math.floor(NOW / 1000),
      livemode: false,
      data: {
        object: {
          id: "tx_" + faker.string.alphanumeric(14),
          asset: ORG.asset,
          amount: "2000.0000000",
          status: "completed",
          stellar_tx: faker.string.hexadecimal({ length: 12, prefix: "" }),
          corridor: "INR-INRT",
        },
      },
    },
    null,
    2,
  );

export interface SepEndpoint {
  name: string;
  desc: string;
  status: "up" | "degraded" | "down";
  ms: number;
}

export const sepEndpoints: SepEndpoint[] = [
  { name: "SEP-1", desc: "stellar.toml", status: "up", ms: 41 },
  { name: "SEP-10", desc: "Web auth", status: "up", ms: 88 },
  { name: "SEP-24", desc: "Interactive deposit/withdraw", status: "up", ms: 132 },
  { name: "SEP-31", desc: "Cross-border", status: "degraded", ms: 410 },
  { name: "SEP-38", desc: "Quotes", status: "up", ms: 96 },
];

export const infra = [
  { name: "Horizon", status: "up" as const, ms: 64 },
  { name: "Soroban RPC", status: "up" as const, ms: 78 },
];

export const usageSeries = Array.from({ length: 40 }, (_, i) => ({
  t: NOW - (39 - i) * 90_000,
  rpm: Math.round(180 + Math.sin(i / 3) * 60 + faker.number.float() * 50),
}));

export const usage = { errorRate: 0.42, rateLimitHeadroom: 73, p95: 142 };

const METHODS = ["GET", "POST", "POST", "GET", "POST"];
const PATHS = ["/sep24/transactions", "/sep10/auth", "/sep38/quote", "/payments", "/kyc/status", "/sep24/info", "/payouts"];

export interface ReqLog {
  id: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  key: string;
  at: number;
}

export const requestLogs: ReqLog[] = Array.from({ length: 60 }, (_, i) => {
  const r = faker.number.float();
  const status = r < 0.9 ? 200 : r < 0.95 ? 201 : r < 0.98 ? 400 : r < 0.99 ? 401 : 500;
  return {
    id: faker.string.alphanumeric(10),
    method: faker.helpers.arrayElement(METHODS),
    path: faker.helpers.arrayElement(PATHS),
    status,
    ms: Math.round(12 + faker.number.float() * 240),
    key: faker.helpers.arrayElement(["sk_live_••a4F2", "sk_live_••9bC1", "sk_test_••3dE7"]),
    at: NOW - i * 45_000 - faker.number.float() * 40_000,
  };
}).sort((a, b) => b.at - a.at);

export const STELLAR_TOML = `# stellar.toml for ${ORG.homeDomain}
VERSION="2.7.0"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ACCOUNTS=["${ORG.issuer}"]

SIGNING_KEY="${ORG.issuer}"
WEB_AUTH_ENDPOINT="https://${ORG.homeDomain}/auth"
TRANSFER_SERVER_SEP0024="https://${ORG.homeDomain}/sep24"
KYC_SERVER="https://${ORG.homeDomain}/kyc"
ANCHOR_QUOTE_SERVER="https://${ORG.homeDomain}/sep38"

[DOCUMENTATION]
ORG_NAME="${ORG.name}"
ORG_URL="https://${ORG.homeDomain}"
ORG_DESCRIPTION="INR on/off-ramp anchor on Stellar, operated on Indian rails."
ORG_OFFICIAL_EMAIL="anchor@${ORG.homeDomain}"

[[CURRENCIES]]
code="${ORG.asset}"
issuer="${ORG.issuer}"
display_decimals=7
name="Indian Rupee Token"
desc="1 INRT is backed 1:1 by INR held in regulated reserves."
is_asset_anchored=true
anchor_asset_type="fiat"
anchor_asset="INR"
status="live"

[[PRINCIPALS]]
name="${ORG.name} Treasury"
email="treasury@${ORG.homeDomain}"
`;
