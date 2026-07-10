"use client";

import * as RSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export function Slider({
  value,
  className,
  rangeClassName,
  trackClassName,
  thumbCount = 1,
  ...props
}: {
  value?: number[];
  className?: string;
  rangeClassName?: string;
  trackClassName?: string;
  thumbCount?: number;
} & Omit<React.ComponentProps<typeof RSlider.Root>, "value">) {
  const thumbs = value?.length ?? thumbCount;
  return (
    <RSlider.Root
      value={value}
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
      {...props}
    >
      <RSlider.Track className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-3", trackClassName)}>
        <RSlider.Range className={cn("absolute h-full rounded-full bg-brand", rangeClassName)} />
      </RSlider.Track>
      {Array.from({ length: thumbs }).map((_, i) => (
        <RSlider.Thumb
          key={i}
          className="block size-4 rounded-full border-2 border-brand bg-white shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-transform hover:scale-110 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(171,159,242,0.3)]"
        />
      ))}
    </RSlider.Root>
  );
}
