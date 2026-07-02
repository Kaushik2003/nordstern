import { fakerEN_IN as faker } from "@faker-js/faker";
import { liveTx, users } from "./store";
import type { TapeEvent } from "./types";

/* ============================================================
   Mock event generator (PRD §7). Emits a synthetic event every
   ~2–6s (weighted: deposits > withdrawals > KYC > alert), wired
   to the live tape, globe arcs, Overview counters and the tx
   table. Pausable (implicitly during the Withdraw flow) and
   speed-controllable (demo mode).
   ============================================================ */

type Listener = (e: TapeEvent) => void;

const ALERTS: { severity: "warn" | "crit"; message: string }[] = [
  { severity: "warn", message: "USDC liquidity covers ~2h at current flow. Top up, or widen the off-ramp spread." },
  { severity: "warn", message: "Large redemption queued — ₹1,20,000 off-ramp from a T2 user." },
  { severity: "crit", message: "Payout service latency elevated (P95 4.2s). Watching." },
  { severity: "warn", message: "Backing ratio drifted to 101.8% after a burst of mints." },
];

function id() {
  return faker.string.alphanumeric(10);
}

class EventEngine {
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private speed = 1;
  private running = false;
  recent: TapeEvent[] = [];

  start() {
    if (this.running || typeof window === "undefined") return;
    this.running = true;
    this.schedule(800);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  setSpeed(s: number) {
    this.speed = s;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), ms / this.speed);
  }

  private emit(e: TapeEvent) {
    this.recent = [e, ...this.recent].slice(0, 80);
    this.listeners.forEach((l) => l(e));
  }

  /** Build (but don't schedule) one event — used by tick and burst. */
  private make(): TapeEvent {
    const r = faker.number.float();
    const at = Date.now();
    if (r < 0.72) {
      return { id: id(), at, kind: "tx", tx: liveTx(at) };
    } else if (r < 0.93) {
      const u = users[Math.floor(faker.number.float() * users.length)];
      return { id: id(), at, kind: "kyc", userName: u.name, initials: u.initials, tier: u.tier };
    }
    const a = faker.helpers.arrayElement(ALERTS);
    return { id: id(), at, kind: "alert", severity: a.severity, message: a.message };
  }

  /** Fire a specific alert into the stream (demo scenario). */
  pushAlert(severity: "warn" | "crit", message: string) {
    this.emit({ id: id(), at: Date.now(), kind: "alert", severity, message });
  }

  /** Fire a withdrawal walking through the live stream (demo scenario). */
  pushWithdrawal() {
    const at = Date.now();
    const tx = liveTx(at);
    tx.dir = "out";
    tx.type = "withdraw";
    tx.status = "payout";
    tx.corridor = "INRT → INR";
    this.emit({ id: id(), at, kind: "tx", tx });
  }

  /** Fire a burst of deposits (demo scenario). */
  burst(n = 6) {
    for (let i = 0; i < n; i++) {
      const at = Date.now();
      const tx = liveTx(at);
      tx.dir = "in";
      tx.type = "deposit";
      tx.status = faker.helpers.arrayElement(["received", "minting", "settled"]);
      tx.corridor = "INR → INRT";
      setTimeout(() => this.emit({ id: id(), at: Date.now(), kind: "tx", tx }), i * 280);
    }
  }

  private tick() {
    if (!this.running) return;
    if (!this.paused) this.emit(this.make());
    this.schedule(2000 + faker.number.float() * 4000);
  }
}

export const engine = new EventEngine();
