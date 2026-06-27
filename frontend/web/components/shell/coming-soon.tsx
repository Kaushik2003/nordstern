import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import { PageContainer, PageHeader } from "./page";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

export function ComingSoon({
  title,
  subtitle,
  icon: Icon,
  points,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  points: string[];
}) {
  return (
    <PageContainer>
      <PageHeader title={title} subtitle={subtitle} actions={<Pill tone="brand">Phase 2–3</Pill>} />
      <Card className="overflow-hidden">
        <div className="relative grid gap-8 p-7 sm:grid-cols-[auto_1fr] sm:p-10">
          <div className="glow-brand-soft pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative grid size-16 place-items-center rounded-[18px] border border-border-subtle bg-surface-2">
            <Icon className="size-7 text-brand" />
          </div>
          <div className="relative">
            <h2 className="font-display text-[19px] font-semibold tracking-tight text-text-primary">
              This surface is on the build roadmap
            </h2>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-text-secondary">
              The hero trio — Overview, Treasury and Pricing — is built to a mirror finish first. Here&apos;s what
              lands on this screen next, all wired to the same live synthetic engine.
            </p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[13px] text-text-secondary">
                  <Check className="mt-0.5 size-4 shrink-0 text-pos" />
                  {p}
                </li>
              ))}
            </ul>
            <Link
              href="/overview"
              className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-300"
            >
              Back to Overview <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
