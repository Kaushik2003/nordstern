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
        "relative rounded-[14px] border border-border-subtle bg-surface-1",
        "transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        interactive && "cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-hover",
        className,
      )}
      {...props}
    >
      {glow && (
        <div className="glow-brand-soft pointer-events-none absolute inset-0 rounded-[14px]" aria-hidden />
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
