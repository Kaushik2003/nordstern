import { Section } from "@/components/ui/section";
import { Heading, Text } from "@/components/ui/typography";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { TRUST } from "@/lib/content";

export function Trust() {
  return (
    <Section id="trust" tone="noir" className="overflow-hidden">
      <Reveal>
        <Heading className="max-w-xl text-white">{TRUST.title}</Heading>
      </Reveal>

      <Stagger className="mt-16 grid gap-10 sm:grid-cols-3">
        {TRUST.stats.map((s) => (
          <StaggerItem key={s.label} className="border-l border-white/15 pl-6">
            <p className="text-[clamp(2.5rem,5vw,4rem)] font-medium tracking-tight text-white">
              {s.value}
            </p>
            <p className="mt-1 text-sm text-white/60">{s.label}</p>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal delay={0.1}>
        <Text className="mt-14 max-w-xl text-white/70">{TRUST.lead}</Text>
      </Reveal>

      {/* customer results */}
      <Stagger className="mt-14 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
        {TRUST.results.map((r) => (
          <StaggerItem key={r.brand}>
            <p className="text-3xl font-medium tracking-tight text-white">
              {r.value}
            </p>
            <p className="mt-1 text-sm text-white/60">{r.caption}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/40">
              {r.brand}
            </p>
          </StaggerItem>
        ))}
      </Stagger>
    </Section>
  );
}
