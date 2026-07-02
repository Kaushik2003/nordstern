"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { Tip } from "./tooltip";

export function Copyable({
  value,
  display,
  full,
  mono = true,
  className,
  iconSize = 12,
}: {
  value: string;
  display?: string;
  full?: string;
  mono?: boolean;
  className?: string;
  iconSize?: number;
}) {
  const { copied, copy } = useCopy();
  const isCopied = copied === value;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copy(value);
      }}
      className={cn(
        "group inline-flex items-center gap-1.5 text-text-secondary transition-colors hover:text-text-primary",
        mono && "font-mono text-[12px] tabular-nums",
        className,
      )}
    >
      <Tip content={full ?? value}>
        <span>{display ?? value}</span>
      </Tip>
      {isCopied ? (
        <Check style={{ width: iconSize, height: iconSize }} className="text-pos" />
      ) : (
        <Copy
          style={{ width: iconSize, height: iconSize }}
          className="text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </button>
  );
}
