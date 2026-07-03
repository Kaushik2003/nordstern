"use client";

import { ArrowUpRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/motion/reveal";
import { OutcomeGallery } from "./outcome-gallery";
import { OUTCOMES } from "@/lib/content";

/**
 * Editorial full-width section matching the reference layout:
 * - Top: Full-width split header (left: arrow + two-tone title, right: description)
 * - Bottom: Full-width three-card editorial composition showcasing the platform
 */
export function Outcomes() {
  return (
    <Section id="outcomes">
      <div className="flex flex-col gap-16 lg:gap-20">
        {/* Header */}
        <Reveal>
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-12 border-b border-line pb-12">
            {/* Left Column (Title + Icon) */}
            <div className="flex flex-col gap-6 lg:col-span-7">
              <div className="flex size-11 items-center justify-center rounded-full bg-brand text-white shadow-sm">
                <ArrowUpRight className="size-5" />
              </div>
              <h2 className="text-[clamp(2.2rem,5vw,3.6rem)] font-normal leading-[1.05] tracking-[-0.025em] text-ink">
                One platform to{" "}
                <span className="text-subtle block lg:inline">launch your anchor.</span>
              </h2>
            </div>

            {/* Right Column (Description) */}
            <div className="flex items-end lg:col-start-9 lg:col-span-4 lg:justify-end">
              <p className="text-[16px] leading-[1.6] text-ink/75 max-w-[28rem] lg:text-right">
                {OUTCOMES.lead}
              </p>
            </div>
          </div>
        </Reveal>

        {/* Content (Editorial Card Gallery Centerpiece) */}
        <div className="w-full">
          <Reveal y={24}>
            <OutcomeGallery />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

