"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, X, Clapperboard } from "lucide-react";
import { useScenario } from "@/lib/scenario";

export function ScenarioOverlay() {
  const { running, paused, step, total, beat, pause, resume, reset, stop } = useScenario();

  return (
    <AnimatePresence>
      {running && beat && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed bottom-5 left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 md:bottom-6"
        >
          <div className="overflow-hidden rounded-[16px] border border-border-default bg-surface-3/95 shadow-lg backdrop-blur-xl">
            {/* progress segments — active one fills over the beat duration */}
            <div className="flex gap-1 px-3 pt-3">
              {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-surface-1">
                  {i < step ? (
                    <div className="h-full w-full rounded-full bg-brand" />
                  ) : i === step ? (
                    <motion.div
                      key={`${step}-${paused}`}
                      className="h-full rounded-full bg-brand"
                      initial={{ width: paused ? "60%" : "0%" }}
                      animate={{ width: paused ? "60%" : "100%" }}
                      transition={{ duration: paused ? 0 : beat.duration / 1000, ease: "linear" }}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand-fill text-brand">
                <Clapperboard className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-text-primary">{beat.caption}</span>
                  <span className="shrink-0 font-mono text-[10.5px] text-text-tertiary">{step + 1}/{total}</span>
                </div>
                <p className="truncate text-[12px] text-text-secondary">{beat.sub}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button onClick={paused ? resume : pause} aria-label={paused ? "Resume" : "Pause"} className="grid size-8 place-items-center rounded-[8px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary">
                  {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                </button>
                <button onClick={reset} aria-label="Reset" className="grid size-8 place-items-center rounded-[8px] text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary">
                  <RotateCcw className="size-4" />
                </button>
                <button onClick={stop} aria-label="End demo" className="grid size-8 place-items-center rounded-[8px] text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
