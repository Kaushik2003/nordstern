import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/typography";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { ICONS } from "@/components/ui/icon-map";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { AUDIENCES } from "@/lib/content";
import { cn } from "@/lib/cn";

export function Audiences() {
  return (
    <Section id="audiences" tone="canvas">
      <SectionHeader
        eyebrow={AUDIENCES.eyebrow}
        title={AUDIENCES.title}
        lead={AUDIENCES.lead}
        className="max-w-2xl"
      />

      <Stagger className="mt-14 grid gap-5 sm:gap-6 md:grid-cols-2 md:auto-rows-fr">
        {AUDIENCES.items.map((item, i) => {
          const Icon = ICONS[item.icon];
          const tall = i === 0;
          return (
            <StaggerItem key={item.title} className={cn(tall && "md:row-span-2")}>
              <Card
                as="a"
                interactive
                className={cn("flex h-full flex-col", tall && "md:min-h-[32rem]")}
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-xl text-brand-700">
                    <Icon />
                  </span>
                  <IconButton />
                </div>
                <h3 className="mt-6 text-xl font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
                  {item.body}
                </p>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </Section>
  );
}
