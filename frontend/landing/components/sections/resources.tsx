import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { RESOURCES } from "@/lib/content";

export function Resources() {
  return (
    <Section id="resources" tone="surface">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        {/* left: header + post list */}
        <Reveal>
          <SectionHeader title={RESOURCES.title} />
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {RESOURCES.posts.map((p) => (
              <li key={p.title} className="py-4">
                <p className="text-xs uppercase tracking-wide text-subtle">
                  {p.tag} · {p.read}
                </p>
                <a href="#" className="mt-1 block text-lg font-medium hover:text-brand-700">
                  {p.title}
                </a>
              </li>
            ))}
          </ul>
          <Button href={RESOURCES.cta.href} variant="primary" size="sm" className="mt-8">
            {RESOURCES.cta.label}
          </Button>
        </Reveal>

        {/* right: featured cards */}
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {RESOURCES.featured.map((f) => (
            <StaggerItem key={f.title}>
              <Card as="a" tone="outline" interactive className="flex h-full flex-col justify-between">
                <div className="aspect-[4/3] rounded-mock bg-gradient-to-br from-surface to-brand-100" />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <h3 className="text-lg font-medium leading-snug">{f.title}</h3>
                  <IconButton />
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </Section>
  );
}
