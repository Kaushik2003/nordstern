import { fakerEN_IN as faker } from "@faker-js/faker";
import { users, transactions, series, NOW, HOUR } from "./store";
import { CITIES } from "./geo";

faker.seed(53);

/* ---- Geographic density (drives the India choropleth) ---- */
export interface Density {
  count: number;
  volume: number;
}
export const stateDensity: Record<string, Density> = {};
export const cityDensity: Record<string, Density & { state: string; lat: number; lng: number }> = {};
for (const u of users) {
  (stateDensity[u.state] ??= { count: 0, volume: 0 });
  stateDensity[u.state].count += 1;
  stateDensity[u.state].volume += u.lifetimeVolume;
  const city = CITIES.find((c) => c.name === u.city);
  if (city) {
    (cityDensity[u.city] ??= { count: 0, volume: 0, state: u.state, lat: city.lat, lng: city.lng });
    cityDensity[u.city].count += 1;
    cityDensity[u.city].volume += u.lifetimeVolume;
  }
}
export const maxStateVolume = Math.max(...Object.values(stateDensity).map((d) => d.volume), 1);

/* ---- Demographics ---- */
export const ageBands = [
  { band: "18–24", pct: 18 },
  { band: "25–34", pct: 38 },
  { band: "35–44", pct: 24 },
  { band: "45–54", pct: 13 },
  { band: "55+", pct: 7 },
];

export const tierDist = (["T0", "T1", "T2"] as const).map((t) => ({
  tier: t,
  count: users.filter((u) => u.tier === t).length,
}));

export const deviceSplit = [
  { label: "Android", pct: 71 },
  { label: "iOS", pct: 22 },
  { label: "Web", pct: 7 },
];

export const languages = [
  { label: "Hindi", pct: 34 },
  { label: "English", pct: 28 },
  { label: "Tamil", pct: 11 },
  { label: "Telugu", pct: 9 },
  { label: "Marathi", pct: 8 },
  { label: "Bengali", pct: 6 },
  { label: "Other", pct: 4 },
];

export const newVsReturning = { newU: 31, returning: 69 };

const SOURCES = ["Lobstr", "Vibrant", "Beans", "Direct API", "Keybase"];
export const sourceAttribution = SOURCES.map((s) => {
  const count = users.filter((u) => u.source === s).length;
  return { source: s, count, conversion: +(38 + faker.number.float() * 34).toFixed(1) };
}).sort((a, b) => b.count - a.count);

/* ---- Behavioral ---- */
const HIST_BUCKETS = [
  { label: "<₹1k", lo: 0, hi: 1000 },
  { label: "₹1–2k", lo: 1000, hi: 2000 },
  { label: "₹2–5k", lo: 2000, hi: 5000 },
  { label: "₹5–10k", lo: 5000, hi: 10000 },
  { label: "₹10–25k", lo: 10000, hi: 25000 },
  { label: ">₹25k", lo: 25000, hi: Infinity },
];
export const txSizeHistogram = HIST_BUCKETS.map((b) => ({
  label: b.label,
  count: transactions.filter((t) => t.amount >= b.lo && t.amount < b.hi).length,
}));

/** 7 days × 24 hours intensity matrix — "when money moves". */
export const timeOfDay: number[][] = Array.from({ length: 7 }, (_, d) => {
  const weekend = d >= 5 ? 0.7 : 1;
  return Array.from({ length: 24 }, (_, h) => {
    const morning = Math.exp(-((h - 11) ** 2) / 10);
    const evening = Math.exp(-((h - 20) ** 2) / 8);
    const base = (morning * 0.8 + evening) * weekend;
    return +(Math.min(1, base * (0.8 + faker.number.float() * 0.3))).toFixed(2);
  });
});

/* ---- Cohort retention (triangular) ---- */
export const cohortLabels = ["5 wks ago", "4 wks ago", "3 wks ago", "2 wks ago", "Last wk", "This wk"];
export const cohortRetention: (number | null)[][] = cohortLabels.map((_, row) => {
  const weeks = 6 - row;
  const base = [100, 58, 46, 39, 34, 30];
  return Array.from({ length: 6 }, (_, col) =>
    col < weeks ? Math.round(base[col] * (0.9 + faker.number.float() * 0.18)) : null,
  );
});

/* ---- Corridors ---- */
export const corridors = [
  { name: "INR → INRT", volume: 4.31e7, growth: 22.4, latencyMs: 2100 },
  { name: "INRT → INR", volume: 1.92e7, growth: 8.1, latencyMs: 3400 },
  { name: "USDC ⇄ INRT", volume: 6.4e6, growth: 41.2, latencyMs: 5200 },
  { name: "Cross-border in", volume: 2.1e6, growth: 14.7, latencyMs: 6100 },
];

/* ---- Concentration / whales ---- */
const sortedByVol = [...users].sort((a, b) => b.lifetimeVolume - a.lifetimeVolume);
const totalVol = sortedByVol.reduce((s, u) => s + u.lifetimeVolume, 0);
const top1pct = sortedByVol.slice(0, Math.ceil(sortedByVol.length * 0.01));
export const concentration = {
  topUsers: sortedByVol.slice(0, 8),
  top1Share: Math.round((top1pct.reduce((s, u) => s + u.lifetimeVolume, 0) / totalVol) * 100),
  totalVol,
};

/* ---- Predictive forecast (24h actual + 48h forecast) ---- */
export interface ForecastPoint {
  t: number;
  value: number;
  lo?: number;
  hi?: number;
  liq?: number;
  actual: boolean;
}
export const volumeForecast: ForecastPoint[] = (() => {
  const out: ForecastPoint[] = [];
  const intraday = (h: number) => 0.55 + 0.45 * (Math.exp(-((h - 11) ** 2) / 14) + Math.exp(-((h - 20) ** 2) / 12));
  for (let i = -24; i <= 48; i++) {
    const t = NOW + i * HOUR;
    const h = new Date(t).getHours();
    const trend = 1 + i * 0.0016;
    const baseV = 38000 * intraday(h) * trend;
    if (i <= 0) {
      out.push({ t, value: Math.round(baseV * (0.9 + faker.number.float() * 0.2)), liq: Math.round(baseV * 0.62), actual: true });
    } else {
      const widen = 1 + i * 0.014;
      const v = Math.round(baseV);
      out.push({ t, value: v, lo: Math.round(v / widen), hi: Math.round(v * widen), liq: Math.round(baseV * 0.6), actual: false });
    }
  }
  return out;
})();

/* ---- Benchmark vs platform median ---- */
export const benchmark = [
  { metric: "KYC pass rate", you: 85.2, median: 79.8, unit: "%" },
  { metric: "Settlement P95", you: 2.4, median: 4.1, unit: "s", lowerBetter: true },
  { metric: "Off-ramp spread", you: 1.5, median: 1.7, unit: "%", lowerBetter: true },
  { metric: "Dispute rate", you: 0.3, median: 0.6, unit: "%", lowerBetter: true },
];

/* ---- Revenue by source (reuses the daily series) ---- */
export const revenueSeries = series.map((p) => ({ t: p.t, fees: p.fees, spread: p.spread, yield: p.yield }));
