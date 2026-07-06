import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small uppercase label above a heading. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-medium uppercase tracking-[0.18em] text-brand-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

const HEADING_SIZE = {
  display:
    "text-[clamp(2rem,4.8vw,3.9rem)] font-normal leading-[1.03] tracking-[-0.025em]",
  h2: "text-[clamp(1.9rem,3.8vw,3rem)] font-normal leading-[1.08] tracking-[-0.025em]",
  h3: "text-[clamp(1.2rem,1.9vw,1.55rem)] font-medium leading-[1.15] tracking-[-0.015em]",
} as const;

/**
 * Editorial display heading — low weight, tight tracking (reference feel).
 * `size` picks the scale (and its matching weight); `as` picks the tag for a
 * correct document outline.
 */
export function Heading({
  children,
  className,
  as,
  size = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  size?: keyof typeof HEADING_SIZE;
}) {
  const Tag = as || (size === "display" ? "h2" : size);
  return (
    <Tag className={cn("text-balance", HEADING_SIZE[size], className)}>
      {children}
    </Tag>
  );
}

/** Muted supporting paragraph. */
export function Text({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[17px] leading-relaxed text-muted text-pretty", className)}>
      {children}
    </p>
  );
}

/**
 * Section intro block: eyebrow + heading + optional lead. Dedupes the repeated
 * header pattern across sections. `align` controls text alignment.
 */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
  headingSize = "h2",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  headingSize?: keyof typeof HEADING_SIZE;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading size={headingSize}>{title}</Heading>
      {lead ? <Text className={cn("max-w-xl", align === "center" && "mx-auto")}>{lead}</Text> : null}
    </div>
  );
}
