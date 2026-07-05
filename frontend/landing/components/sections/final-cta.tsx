import { Section } from "@/components/ui/section";
import { Heading } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Aurora } from "@/components/motion/aurora";
import { Reveal } from "@/components/motion/reveal";
import { FINAL_CTA } from "@/lib/content";

export function FinalCTA() {
  return (
    <Section id="cta" tone="noir" className="overflow-hidden text-center">
      <Aurora intensity="soft" className="opacity-30" />
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center">
        <Heading className="text-white">{FINAL_CTA.title}</Heading>
        <Button id="final-cta-button" href={FINAL_CTA.cta.href} variant="white" className="mt-9">
          {FINAL_CTA.cta.label}
        </Button>
      </Reveal>
    </Section>
  );
}
