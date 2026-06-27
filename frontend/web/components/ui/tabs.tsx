"use client";

import * as RT from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

export const Tabs = RT.Root;
export const TabContent = RT.Content;

export function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <RT.List className={cn("flex gap-1 overflow-x-auto border-b border-border-subtle", className)}>{children}</RT.List>
  );
}

export function TabTrigger({ value, children, count }: { value: string; children: React.ReactNode; count?: number }) {
  return (
    <RT.Trigger
      value={value}
      className={cn(
        "relative -mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-[13px] font-medium text-text-tertiary transition-colors",
        "hover:text-text-secondary data-[state=active]:border-brand data-[state=active]:text-text-primary",
      )}
    >
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-text-secondary">{count}</span>
      )}
    </RT.Trigger>
  );
}
