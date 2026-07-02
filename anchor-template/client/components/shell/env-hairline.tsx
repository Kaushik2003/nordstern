"use client";

import { useApp } from "@/lib/providers";

/** A 2px brand-tint hairline across the very top while in Testnet, so it's
 *  never ambiguous which environment is live (PRD §3). */
export function EnvHairline() {
  const { env } = useApp();
  if (env !== "testnet") return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-70"
    />
  );
}
