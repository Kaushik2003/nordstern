import { type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Container } from "./container";

type Tone = "canvas" | "surface" | "noir";

const TONE: Record<Tone, string> = {
  canvas: "bg-canvas text-ink",
  surface: "bg-surface text-ink",
  noir: "bg-noir text-white",
};

/**
 * Full-bleed section band with consistent vertical rhythm. `tone` swaps the
 * background (light canvas / off-white surface / dark noir) so feature bands
 * alternate like the reference. Content is auto-wrapped in a Container unless
 * `bleed` is set.
 */
export function Section({
  children,
  id,
  className,
  containerClassName,
  tone = "canvas",
  bleed = false,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
  tone?: Tone;
  bleed?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative w-full py-16 sm:py-24 lg:py-32",
        TONE[tone],
        className,
      )}
    >
      {bleed ? children : <Container className={containerClassName}>{children}</Container>}
    </section>
  );
}
