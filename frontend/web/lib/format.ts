/* ============================================================
   NordStern — number, currency & data formatting
   This is where a financial product earns or loses credibility.
   Indian Rupee, lakh/crore grouping, mono tabular numbers,
   Stellar address/hash truncation, IST timestamps.
   ============================================================ */

const inrGroup = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrGroupWhole = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Plain Indian-grouped number, no symbol. 1245300 -> "12,45,300" */
export function groupIN(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Full rupee: ₹54,200.00 / ₹12,45,300.00 (Indian grouping). */
export function inr(value: number, opts?: { decimals?: number; sign?: boolean }): string {
  const decimals = opts?.decimals ?? 2;
  const fmt =
    decimals === 2
      ? inrGroup
      : decimals === 0
        ? inrGroupWhole
        : new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          });
  const abs = Math.abs(value);
  const body = `₹${fmt.format(abs)}`;
  if (opts?.sign) return `${value < 0 ? "−" : "+"}${body}`;
  return value < 0 ? `−${body}` : body;
}

/** Compact rupee with lakh/crore: ₹54.2K, ₹1.2L, ₹4.82Cr. */
export function inrCompact(value: number, opts?: { sign?: boolean; decimals?: number }): string {
  const abs = Math.abs(value);
  const d = opts?.decimals;
  let body: string;
  if (abs >= 1e7) body = `₹${trim(abs / 1e7, d ?? 2)}Cr`;
  else if (abs >= 1e5) body = `₹${trim(abs / 1e5, d ?? 1)}L`;
  else if (abs >= 1e3) body = `₹${trim(abs / 1e3, d ?? 1)}K`;
  else body = `₹${trim(abs, d ?? 0)}`;
  if (opts?.sign) return `${value < 0 ? "−" : "+"}${body}`;
  return value < 0 ? `−${body}` : body;
}

/** Compact plain number: 12,480 -> "12.5K", 1240000 -> "12.4L". */
export function compactIN(value: number): string {
  const abs = Math.abs(value);
  const s = value < 0 ? "−" : "";
  if (abs >= 1e7) return `${s}${trim(abs / 1e7, 2)}Cr`;
  if (abs >= 1e5) return `${s}${trim(abs / 1e5, 2)}L`;
  if (abs >= 1e3) return `${s}${trim(abs / 1e3, 1)}K`;
  return `${s}${groupIN(abs)}`;
}

function trim(n: number, decimals: number): string {
  return n
    .toFixed(decimals)
    .replace(/\.?0+$/, (m) => (m.includes(".") ? "" : m));
}

/** Token amount with asset code: 54,200.0000000 INRT (Stellar = 7 dp). */
export function token(value: number, code = "INRT", decimals = 7): string {
  return `${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} ${code}`;
}

/** Truncate a Stellar address middle: GA3F…X9QZ */
export function truncAddr(addr: string, lead = 4, tail = 4): string {
  if (!addr || addr.length <= lead + tail + 1) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

/** Truncate a tx hash / id. */
export function truncHash(hash: string, lead = 6, tail = 4): string {
  if (!hash || hash.length <= lead + tail + 1) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}

/** Signed percentage delta: ▲ +12.4%, ▼ −3.1%, – */
export function delta(value: number, decimals = 1): { label: string; arrow: string; dir: "pos" | "neg" | "flat" } {
  if (Math.abs(value) < 0.05) return { label: "–", arrow: "", dir: "flat" };
  const dir = value > 0 ? "pos" : "neg";
  const arrow = value > 0 ? "▲" : "▼";
  const label = `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(decimals)}%`;
  return { label, arrow, dir };
}

/** Signed percent string only. */
export function pct(value: number, decimals = 1): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(decimals)}%`;
}

const istTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const istFull = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** 14:32:08 (IST clock). */
export function clockIST(d: Date | number): string {
  return istTime.format(typeof d === "number" ? new Date(d) : d);
}

/** 27 Jun 2026, 14:32:08 IST (absolute, on hover). */
export function absIST(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return `${istFull.format(date).replace(",", ",").replace(/(\d{2}:\d{2}:\d{2})/, "$1")} IST`;
}

/** Relative recency: now, 2m ago, 1h ago, 3d ago. */
export function relTime(d: Date | number, now = Date.now()): string {
  const t = typeof d === "number" ? d : d.getTime();
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 5) return "now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}
