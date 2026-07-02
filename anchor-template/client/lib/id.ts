/* Small helpers for simulated mutations (ids, secrets, timestamps).
   Kept at module scope so they're called from event handlers, not render. */

const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function uid(len = 10): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALNUM[Math.floor(Math.random() * ALNUM.length)];
  return s;
}

export function secretKey(env: "test" | "live" = "test"): string {
  return `sk_${env}_${uid(32)}`;
}

export function digits(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/** Current epoch ms — wrapped so callers stay lint-clean in handlers. */
export function nowMs(): number {
  return Date.now();
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}
