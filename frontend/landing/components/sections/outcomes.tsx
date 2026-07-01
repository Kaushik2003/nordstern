import { Section } from "@/components/ui/section";
import { Heading } from "@/components/ui/typography";
import { Reveal } from "@/components/motion/reveal";
import { OutcomeRotator } from "./outcome-rotator";
import { OutcomeGallery } from "./outcome-gallery";
import { OUTCOMES } from "@/lib/content";

/**
 * Editorial two-column section: brand thesis (left) + auto-rotating pitch and
 * two offset images (right). Order on mobile: heading → rotator → gallery.
 */
export function Outcomes() {
  return (
    <Section id="outcomes">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 xl:gap-24">
        {/* left — thesis, minimal, kicker pinned bottom */}
        <Reveal className="flex flex-col justify-between gap-14">
          <Heading size="display" className="max-w-[11ch]">
            {OUTCOMES.heading}
          </Heading>
          <p className="text-xs uppercase tracking-[0.2em] text-subtle">
            {OUTCOMES.kicker}
          </p>
        </Reveal>

        {/* right — rotating pitch + editorial images */}
        <div className="flex min-w-0 flex-col gap-14">
          <OutcomeRotator />
          <Reveal y={24}>
            <OutcomeGallery />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
