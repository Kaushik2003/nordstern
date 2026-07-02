"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { inr, inrCompact } from "./format";

export type MoneyFormat = "full" | "compact";
export type Density = "comfortable" | "compact";
export type Env = "testnet" | "mainnet";

interface AppContextValue {
  env: Env;
  setEnv: (e: Env) => void;
  toggleEnv: () => void;
  density: Density;
  toggleDensity: () => void;
  format: MoneyFormat;
  toggleFormat: () => void;
  cmdkOpen: boolean;
  setCmdkOpen: (v: boolean) => void;
  /** Format money honoring the global Full/Compact toggle. */
  money: (value: number, opts?: { sign?: boolean }) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

function usePersisted<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const stored = localStorage.getItem(key) as T | null;
    if (stored) setValue(stored);
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      localStorage.setItem(key, v);
    },
    [key],
  );
  return [value, set];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [env, setEnv] = usePersisted<Env>("ns-env", "testnet");
  const [density, setDensity] = usePersisted<Density>("ns-density", "comfortable");
  const [format, setFormat] = usePersisted<MoneyFormat>("ns-format", "full");
  const [cmdkOpen, setCmdkOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.density = density === "compact" ? "compact" : "comfortable";
    document.documentElement.dataset.env = env;
  }, [density, env]);

  // ⌘K / Ctrl-K opens the command palette anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      env,
      setEnv,
      toggleEnv: () => setEnv(env === "testnet" ? "mainnet" : "testnet"),
      density,
      toggleDensity: () => setDensity(density === "compact" ? "comfortable" : "compact"),
      format,
      toggleFormat: () => setFormat(format === "full" ? "compact" : "full"),
      cmdkOpen,
      setCmdkOpen,
      money: (v, opts) => (format === "compact" ? inrCompact(v, opts) : inr(v, opts)),
    }),
    [env, setEnv, density, setDensity, format, setFormat, cmdkOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
