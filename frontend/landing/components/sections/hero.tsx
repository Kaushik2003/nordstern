"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/typography";
import {
  ArrowUpRight,
  ChevronRight,
  Grid,
  Bank,
  Chart,
} from "@/components/ui/icons";
import { EASE } from "@/components/motion/ease";
import {
  ConsoleDashboard,
  type ConsoleView,
} from "@/components/mockups/console-dashboard";
import { HERO } from "@/lib/content";

const TABS: { id: ConsoleView; label: string; Icon: typeof Grid }[] = [
  { id: "overview", label: "Overview", Icon: Grid },
  { id: "treasury", label: "Treasury", Icon: Bank },
  { id: "pricing", label: "Pricing", Icon: Chart },
];

/** Soft, concentrated aurora — brightest behind the dashboard's right edge. */
function HeroGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute right-[-14%] top-[36%] size-[46rem] rounded-full opacity-35 blur-[150px] [animation:aurora-drift_26s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-brand-200), transparent)",
        }}
      />
      <div
        className="absolute right-[2%] top-[58%] size-[26rem] rounded-full opacity-25 blur-[140px]"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-aurora-cyan), transparent)",
        }}
      />
      <div
        className="absolute left-[-12%] top-[6%] size-[30rem] rounded-full opacity-20 blur-[150px]"
        style={{
          background:
            "radial-gradient(closest-side, var(--color-brand-100), transparent)",
        }}
      />
    </div>
  );
}

export function Hero() {
  const [view, setView] = useState<ConsoleView>("overview");
  const reduce = useReducedMotion();

  /**
   * Sequenced hero entrance (~3s): the text rises in first, staggered top to
   * bottom, then the console card slides up from below. Honors reduced motion.
   */
  const rise = (delay: number, y = 16, duration = 0.6) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration, ease: EASE },
        };

  return (
    <section className="relative overflow-hidden pt-24 pb-0 font-clear-display">
      <HeroGlow />
      <Container>
        {/* headline row */}
        <div className=" grid gap-y-8  lg:grid-cols-[1.35fr_0.85fr] lg:items-start lg:gap-x-12 font-clear-display">
          <div>
            <motion.div {...rise(0.15, 12, 0.55)}>
              <Link href={HERO.eyebrow.href} className="group inline-block">
                <Badge
                  variant="outline"
                  className="gap-2 px-4 py-2.5 text-[13px] shadow-[0_1px_2px_rgba(20,20,43,0.04)] transition-colors group-hover:bg-surface"
                >
                  {HERO.eyebrow.label}
                  <ArrowUpRight className="text-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Badge>
              </Link>
            </motion.div>
            <motion.div {...rise(0.3, 16, 0.65)}>
              <Heading
                as="h1"
                size="display"
                className="mt-7 font-clear-display text-[clamp(2.6rem,6.4vw,5rem)] leading-[1.02] text-ink text-wrap"
              >
                {HERO.title}
              </Heading>
            </motion.div>
          </div>

          {/* lead */}
          <motion.div className="lg:pt-[84px] lg:pl-19" {...rise(0.55, 14, 0.6)}>
            <p className="max-w-[32rem] text-[19px] leading-[1.6] text-ink/75 font-clear-display">
              {HERO.lead}
            </p>
          </motion.div>
        </div>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col items-start gap-6 sm:mt-12 sm:flex-row sm:items-center lg:mt-14 lg:justify-end"
          {...rise(0.8, 12, 0.6)}
        >
          <div className="flex items-center gap-7 font-clear-display">
            <Button
              id="hero-primary-button"
              href={HERO.primary.href}
              variant="primary"
              className="h-12 px-7"
            >
              {HERO.primary.label}
            </Button>

            <Link
              id="hero-secondary-link"
              href={HERO.secondary.href}
              className="group inline-flex items-center gap-1 text-[15px] font-medium text-ink"
            >
              <span className="underline decoration-line decoration-1 underline-offset-[5px] transition-colors group-hover:decoration-ink">
                {HERO.secondary.label}
              </span>

              <ChevronRight className="text-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>

        {/* dashboard — the frame lifts in, then its interior cascades (~6s total) */}
        <motion.div
          className="relative mt-10 lg:mt-14"
          initial={reduce ? false : { opacity: 0, y: 64 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? undefined : { delay: 1.2, duration: 1.2, ease: EASE }}
        >
          {/* clip to 75% of the dashboard height — overlay fades the cut edge */}
          <div className="overflow-hidden" style={{ maxHeight: "65vh" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <ConsoleDashboard view={view} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* smooth fade-out overlay — many stops to avoid visible banding */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-96"
            style={{
              background: [
                "linear-gradient(to bottom,",
                "rgba(255,255,255,0)   0%,",
                "rgba(255,255,255,0.01) 10%,",
                "rgba(255,255,255,0.04) 20%,",
                "rgba(255,255,255,0.10) 30%,",
                "rgba(255,255,255,0.22) 40%,",
                "rgba(255,255,255,0.40) 52%,",
                "rgba(255,255,255,0.62) 64%,",
                "rgba(255,255,255,0.80) 76%,",
                "rgba(255,255,255,0.93) 88%,",
                "rgba(255,255,255,1)   100%",
                ")",
              ].join(" "),
            }}
          />
        </motion.div>
      </Container>
    </section>
  );
}
