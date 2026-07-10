"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/cn";

/** Windowed list — renders only visible rows. Fixed row height. */
export function VirtualRows<T>({
  items,
  rowHeight,
  height,
  renderRow,
  overscan = 10,
  className,
  getKey,
}: {
  items: T[];
  rowHeight: number;
  height: number | string;
  renderRow: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
  getKey?: (item: T, index: number) => string | number;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  return (
    <div ref={parentRef} style={{ height }} className={cn("overflow-auto", className)}>
      <div style={{ height: v.getTotalSize(), position: "relative", width: "100%" }}>
        {v.getVirtualItems().map((vi) => (
          <div
            key={getKey ? getKey(items[vi.index], vi.index) : vi.key}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: rowHeight, transform: `translateY(${vi.start}px)` }}
          >
            {renderRow(items[vi.index], vi.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
