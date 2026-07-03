import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";
import { MISSION } from "@/lib/content";

/**
 * Editorial mission statement: one large, right-aligned paragraph with a pill label
 * on the left and two-tone typography.
 */
export function Mission() {
  return (
    <Section id="mission">
      <Container>
        <Reveal>
          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-12">
            {/* Headline: Aligned to the right-center columns (starts at col 6) */}
            <h2 className="lg:col-start-6 lg:col-span-7 text-[clamp(1.8rem,3.8vw,2.5rem)] font-normal leading-[1.1] tracking-[-0.02em] text-ink">
              {MISSION.title}
            </h2>

            {/* Paragraph: Aligned further right (starts at col 8) */}
            <p className="lg:col-start-8 lg:col-span-5 text-[18px] leading-[1.6] text-ink/75">
              <span className="text-ink">{MISSION.lead}</span>
              <span className="text-subtle">{MISSION.tail}</span>
            </p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
