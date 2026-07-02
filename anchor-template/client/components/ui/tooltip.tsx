"use client";

import * as RT from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RT.Provider delayDuration={150} skipDelayDuration={300}>
      {children}
    </RT.Provider>
  );
}

export function Tip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  if (content == null || content === "") return <>{children}</>;
  return (
    <RT.Root>
      <RT.Trigger asChild>
        <span className="inline-flex cursor-default items-center">{children}</span>
      </RT.Trigger>
      <RT.Portal>
        <RT.Content
          side={side}
          sideOffset={6}
          collisionPadding={10}
          className={cn(
            "z-[60] max-w-xs rounded-[9px] border border-border-default bg-surface-3 px-2.5 py-1.5",
            "text-[12px] leading-snug text-text-primary shadow-lg",
            "data-[state=delayed-open]:animate-rise",
            className,
          )}
        >
          {content}
          <RT.Arrow className="fill-surface-3" />
        </RT.Content>
      </RT.Portal>
    </RT.Root>
  );
}
