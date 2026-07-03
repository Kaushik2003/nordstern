"use client";

import * as RSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        "relative h-[22px] w-[38px] shrink-0 rounded-full border border-border-subtle bg-surface-3 transition-colors duration-200",
        "data-[state=checked]:border-transparent data-[state=checked]:bg-brand",
        "disabled:opacity-40",
        className,
      )}
    >
      <RSwitch.Thumb className="block size-[16px] translate-x-[3px] rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-[18px]" />
    </RSwitch.Root>
  );
}
