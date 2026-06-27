"use client";

import { cn } from "@/lib/cn";
import { delta as fmtDelta } from "@/lib/format";

export type Tone = "pos" | "neg" | "warn" | "crit" | "cool" | "brand" | "neutral";

const toneText: Record<Tone, string> = {
  pos: "text-pos",
  neg: "text-neg",
  warn: "text-warn",
  crit: "text-crit",
  cool: "text-cool",
  brand: "text-brand",
  neutral: "text-text-secondary",
};
const toneBg: Record<Tone, string> = {
  pos: "bg-pos-fill",
  neg: "bg-neg-fill",
  warn: "bg-warn-fill",
  crit: "bg-crit-fill",
  cool: "bg-cool-fill",
  brand: "bg-brand-fill",
  neutral: "bg-surface-2",
};
const toneDot: Record<Tone, string> = {
  pos: "bg-pos",
  neg: "bg-neg",
  warn: "bg-warn",
  crit: "bg-crit",
  cool: "bg-cool",
  brand: "bg-brand",
  neutral: "bg-text-tertiary",
};

export function Dot({ tone = "neutral", pulse }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-1.5">
      {pulse && (
        <span className={cn("absolute inline-flex size-full animate-[dot-pulse_1.5s_ease-in-out_infinite] rounded-full", toneDot[tone])} />
      )}
      <span className={cn("relative inline-flex size-1.5 rounded-full", toneDot[tone])} />
    </span>
  );
}

export function Pill({
  tone = "neutral",
  pulse,
  dot = true,
  icon,
  children,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  dot?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] font-mono text-[11px] font-medium tracking-tight",
        toneBg[tone],
        toneText[tone],
        className,
      )}
    >
      {icon ?? (dot && <Dot tone={tone} pulse={pulse} />)}
      {children}
    </span>
  );
}

export function statusMeta(status: string): { label: string; tone: Tone; pulse?: boolean } {
  switch (status) {
    case "settled":
    case "completed":
    case "verified":
      return { label: cap(status), tone: "pos" };
    case "minting":
      return { label: "Minting", tone: "brand", pulse: true };
    case "burning":
      return { label: "Burning", tone: "brand", pulse: true };
    case "payout":
      return { label: "Payout…", tone: "warn", pulse: true };
    case "received":
      return { label: "Received", tone: "warn", pulse: true };
    case "processing":
    case "pending":
      return { label: cap(status), tone: "warn", pulse: true };
    case "failed":
    case "breach":
      return { label: cap(status), tone: "crit" };
    case "rejected":
      return { label: "Rejected", tone: "crit" };
    case "flagged":
      return { label: "Flagged", tone: "crit" };
    default:
      return { label: cap(status), tone: "neutral" };
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const m = statusMeta(status);
  return (
    <Pill tone={m.tone} pulse={m.pulse} className={className}>
      {m.label}
    </Pill>
  );
}

export function Delta({
  value,
  decimals = 1,
  className,
  showArrow = true,
}: {
  value: number;
  decimals?: number;
  className?: string;
  showArrow?: boolean;
}) {
  const d = fmtDelta(value, decimals);
  const tone = d.dir === "pos" ? "text-pos" : d.dir === "neg" ? "text-neg" : "text-text-tertiary";
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-[12px] tabular-nums", tone, className)}>
      {showArrow && d.arrow && <span className="text-[9px]">{d.arrow}</span>}
      {d.label}
    </span>
  );
}
