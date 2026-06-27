"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { engine } from "./data/events";

/* ============================================================
   Scenario / demo mode (PRD §8). A scripted ~70s sequence that
   navigates across pages, drives the live engine, and narrates
   each beat so a presenter never has to improvise.
   ============================================================ */

export interface Beat {
  caption: string;
  sub: string;
  duration: number;
  run: (nav: (href: string) => void) => void;
}

const BEATS: Beat[] = [
  {
    caption: "Mission control",
    sub: "KPIs count up, the globe begins flowing, the tape streams.",
    duration: 6500,
    run: (nav) => { engine.setSpeed(2.6); engine.start(); nav("/overview"); },
  },
  {
    caption: "Deposits streaming in",
    sub: "Total volume and active users tick; emerald arcs fire toward the hub.",
    duration: 7000,
    run: () => engine.burst(9),
  },
  {
    caption: "The live ledger",
    sub: "Every deposit and withdrawal lands in real time, newest on top.",
    duration: 7000,
    run: (nav) => { nav("/transactions"); engine.burst(5); },
  },
  {
    caption: "A withdrawal settles",
    sub: "Burn detected → payout queued → settled, with a UTR.",
    duration: 6500,
    run: () => { engine.pushWithdrawal(); setTimeout(() => engine.pushWithdrawal(), 1400); },
  },
  {
    caption: "The smart-spread engine",
    sub: "NordStern recommends the optimal spread; the backtest re-runs live.",
    duration: 7500,
    run: (nav) => nav("/pricing?demo=spread"),
  },
  {
    caption: "Liquidity alert",
    sub: "USDC cover is running low — the console flags it instantly.",
    duration: 6000,
    run: (nav) => {
      engine.pushAlert("warn", "USDC liquidity covers ~2h at current flow. Top up, or widen the off-ramp spread.");
      nav("/overview");
    },
  },
  {
    caption: "Withdraw your earnings",
    sub: "The Master Treasury moment — your money, to your corporate account.",
    duration: 9000,
    run: (nav) => nav("/treasury?withdraw=1"),
  },
  {
    caption: "Provably governed",
    sub: "Every action is hash-chained — verify the tamper-evident audit log.",
    duration: 8500,
    run: (nav) => nav("/compliance?demo=verify"),
  },
];

interface ScenarioValue {
  running: boolean;
  paused: boolean;
  step: number;
  total: number;
  beat: Beat | null;
  play: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
}

const Ctx = createContext<ScenarioValue | null>(null);

export function ScenarioProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nav = useCallback((href: string) => router.push(href), [router]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // `advance` drives the timeline. The recursion lives in a plain local
  // function (`step`) rather than a self-referencing memoized callback.
  const advance = useCallback(
    (from: number) => {
      const step = (i: number) => {
        if (i >= BEATS.length) {
          setRunning(false);
          engine.setSpeed(1);
          toast("Demo complete", { description: "Reset to run it again." });
          return;
        }
        setStep(i);
        BEATS[i].run(nav);
        timer.current = setTimeout(() => step(i + 1), BEATS[i].duration);
      };
      step(from);
    },
    [nav],
  );

  const play = useCallback(() => {
    clear();
    setRunning(true);
    setPaused(false);
    setStep(0);
    advance(0);
  }, [clear, advance]);

  const pause = useCallback(() => {
    clear();
    setPaused(true);
    engine.pause();
  }, [clear]);

  const resume = useCallback(() => {
    setPaused(false);
    engine.resume();
    advance(step);
  }, [advance, step]);

  const stop = useCallback(() => {
    clear();
    setRunning(false);
    setPaused(false);
    engine.setSpeed(1);
    engine.resume();
  }, [clear]);

  const reset = useCallback(() => {
    clear();
    setRunning(false);
    setPaused(false);
    setStep(0);
    engine.setSpeed(1);
    engine.resume();
    router.push("/overview");
    toast("Demo reset", { description: "Back to the canonical state." });
  }, [clear, router]);

  useEffect(() => () => clear(), [clear]);

  const value = useMemo<ScenarioValue>(
    () => ({ running, paused, step, total: BEATS.length, beat: running ? BEATS[step] : null, play, pause, resume, reset, stop }),
    [running, paused, step, play, pause, resume, reset, stop],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useScenario(): ScenarioValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useScenario must be used within ScenarioProvider");
  return v;
}
