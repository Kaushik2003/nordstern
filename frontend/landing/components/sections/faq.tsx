"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { FAQ } from "@/lib/content";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" tone="canvas">
      <h2 className="text-[clamp(2.6rem,7vw,5.5rem)] font-normal leading-[0.98] tracking-[-0.035em] text-ink">
        {FAQ.title} <br className="hidden sm:block" />
        <span className="text-muted">{FAQ.titleTail}</span>
      </h2>

      <div className="mt-12 border-t border-line">
        {FAQ.items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="border-b border-line">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={`group flex w-full items-center gap-5 py-6 text-left transition-colors sm:gap-8 ${isOpen ? "bg-surface/60" : "hover:bg-surface/50"}`}
              >
                <span className="w-7 shrink-0 text-sm tabular-nums text-subtle">0{i + 1}</span>
                <span className="flex-1 text-lg font-medium tracking-tight text-ink sm:text-xl">{item.q}</span>
                <ArrowDownRight
                  className={`size-5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-brand-700" : "text-subtle group-hover:text-ink"}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-2xl pb-7 pl-[3rem] pr-8 text-[15px] leading-relaxed text-muted sm:pl-[3.75rem]">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
