"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEventStream } from "@/lib/hooks";
import { clockIST, inr } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { TapeEvent } from "@/lib/data/types";

export function LiveTape({ limit = 14, className }: { limit?: number; className?: string }) {
  const events = useEventStream();
  const rows = events.slice(0, limit);

  return (
    <div className={cn("flex flex-col", className)}>
      <AnimatePresence initial={false}>
        {rows.map((e) => (
          <motion.div
            key={e.id}
            layout
            initial={{ opacity: 0, y: -10, backgroundColor: tint(e) }}
            animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], backgroundColor: { duration: 0.7 } }}
            className="flex items-center gap-2.5 rounded-[8px] px-2 py-[var(--tape-py)]"
          >
            <TapeRow e={e} />
          </motion.div>
        ))}
      </AnimatePresence>
      {rows.length === 0 && (
        <div className="px-2 py-6 text-center text-[12.5px] text-text-tertiary">Listening for live events…</div>
      )}
    </div>
  );
}

function tint(e: TapeEvent) {
  if (e.kind === "tx") return e.tx.dir === "in" ? "rgba(46,192,139,0.14)" : "rgba(255,140,115,0.14)";
  if (e.kind === "alert") return "rgba(242,184,75,0.14)";
  return "rgba(125,184,242,0.12)";
}

function TapeRow({ e }: { e: TapeEvent }) {
  if (e.kind === "kyc") {
    return (
      <>
        <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-text-tertiary">{clockIST(e.at)}</span>
        <ShieldCheck className="size-3.5 shrink-0 text-cool" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-secondary">
          KYC verified · <span className="text-text-primary">{e.userName}</span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-cool">{e.tier}</span>
      </>
    );
  }
  if (e.kind === "alert") {
    return (
      <>
        <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-text-tertiary">{clockIST(e.at)}</span>
        <TriangleAlert className={cn("size-3.5 shrink-0", e.severity === "crit" ? "text-crit" : "text-warn")} />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-secondary">{e.message}</span>
      </>
    );
  }
  const tx = e.tx;
  const inbound = tx.dir === "in";
  return (
    <>
      <span className="w-12 shrink-0 font-mono text-[11px] tabular-nums text-text-tertiary">{clockIST(e.at)}</span>
      {inbound ? (
        <ArrowDownLeft className="size-3.5 shrink-0 text-pos" />
      ) : (
        <ArrowUpRight className="size-3.5 shrink-0 text-neg" />
      )}
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-text-secondary">
        {inbound ? "Deposit · mint" : "Withdraw · payout"} <span className="text-text-tertiary">· {tx.city}</span>
      </span>
      <span className={cn("shrink-0 font-mono text-[12.5px] font-medium tabular-nums", inbound ? "text-pos" : "text-neg")}>
        {inbound ? "+" : "−"}
        {inr(tx.amount)}
      </span>
    </>
  );
}
