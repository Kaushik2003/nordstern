"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/cn";

export interface SegOption<T extends string> {
  label: string;
  value: T;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const layoutId = useId();
  const h = size === "sm" ? "h-7" : "h-8";
  const pad = size === "sm" ? "px-2.5 text-[11.5px]" : "px-3 text-[12.5px]";
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-black/[0.05] bg-black/[0.04] p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors duration-150",
              h,
              pad,
              active ? "text-text-primary font-semibold" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-full border border-black/[0.04] bg-white shadow-xs"
              />
            )}
            <span className="relative z-10">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
