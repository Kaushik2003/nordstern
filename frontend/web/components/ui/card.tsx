"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { Tip } from "./tooltip";

export function Card({
  className,
  interactive,
  glow,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean; glow?: boolean }) {
  return (
    <div
      className={cn(
        "relative rounded-[20px] border border-border-subtle bg-surface-1 shadow-[0_1px_2px_rgba(24,22,54,0.04),0_10px_30px_-20px_rgba(24,22,54,0.16)]",
        "transition-[border-color,background-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        interactive && "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-hover hover:shadow-[0_2px_5px_rgba(24,22,54,0.05),0_22px_48px_-24px_rgba(34,24,78,0.24)]",
        className,
      )}
      {...props}
    >
      {glow && (
        <div className="glow-brand-soft pointer-events-none absolute inset-0 rounded-[20px]" aria-hidden />
      )}
      {children}
    </div>
  );
}

/** Eyebrow header row: mono caps label (left), optional info tooltip + action (right). */
export function CardHead({
  label,
  info,
  action,
  className,
}: {
  label: string;
  info?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-1.5">
        <span className="eyebrow">{label}</span>
        {info && (
          <Tip content={info}>
            <Info className="size-3 text-text-tertiary transition-colors hover:text-text-secondary" />
          </Tip>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-[var(--pad-card)]", className)} {...props} />;
}
