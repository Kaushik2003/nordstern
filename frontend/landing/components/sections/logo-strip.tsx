import { Logos19 } from "@/components/logos19";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/motion/reveal";

/** "Built with" marquee — the Stellar ecosystem and stack NordStern runs on. */
export function LogoStrip() {
  return (
    <Container className="mt-8 sm:mt-12 lg:mt-16">
      <Reveal>
        <div className="flex flex-col gap-12">
          <p className="text-center text-[12px] font-medium uppercase tracking-[0.16em] text-subtle">
            Built with
          </p>
          <Logos19 className="py-0" />
        </div>
      </Reveal>
    </Container>
  );
}
