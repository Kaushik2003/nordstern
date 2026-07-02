"use client";

import { motion } from "framer-motion";
import { TriangleAlert, ChevronRight } from "lucide-react";
import { groupIN } from "@/lib/format";
import { cn } from "@/lib/cn";

export function KycFunnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = stages[0].value;
  const H = 132;
  // weakest transition (largest relative drop)
  let weakest = 1;
  let worst = 0;
  for (let i = 1; i < stages.length; i++) {
    const drop = (stages[i - 1].value - stages[i].value) / stages[i - 1].value;
    if (drop > worst) { worst = drop; weakest = i; }
  }

  return (
    <div className="flex items-end gap-1 sm:gap-2">
      {stages.map((s, i) => {
        const h = (s.value / max) * H;
        const conv = i === 0 ? 100 : (s.value / stages[i - 1].value) * 100;
        const isWeak = i === weakest;
        return (
          <div key={s.label} className="flex flex-1 items-end gap-1 sm:gap-2">
            <div className="flex flex-1 flex-col items-center">
              <div className="mb-1.5 font-mono text-[14px] font-semibold tabular-nums text-text-primary">{groupIN(s.value)}</div>
              <div className="flex w-full items-end justify-center" style={{ height: H }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("w-full max-w-[88px] rounded-t-[8px]", i === stages.length - 1 ? "bg-pos/70" : "bg-brand/50")}
                />
              </div>
              <div className="mt-2 text-center text-[12px] font-medium text-text-secondary">{s.label}</div>
              {i > 0 && (
                <div className={cn("mt-0.5 flex items-center gap-1 font-mono text-[11px]", isWeak ? "text-warn" : "text-text-tertiary")}>
                  {isWeak && <TriangleAlert className="size-3" />}
                  {conv.toFixed(1)}%
                </div>
              )}
            </div>
            {i < stages.length - 1 && <ChevronRight className="mb-12 size-4 shrink-0 text-text-tertiary/50" />}
          </div>
        );
      })}
    </div>
  );
}
