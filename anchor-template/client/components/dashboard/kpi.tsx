"use client";

import { Card, CardBody, CardHead } from "@/components/ui/card";
import { Delta } from "@/components/ui/pill";
import { useCountUp } from "@/lib/hooks";
import { cn } from "@/lib/cn";

export function Kpi({
  label,
  info,
  value,
  render,
  delta,
  sub,
  accent = "text-text-primary",
  size = "md",
  footer,
  className,
  countDuration,
}: {
  label: string;
  info?: string;
  value: number;
  render: (n: number) => string;
  delta?: number;
  sub?: React.ReactNode;
  accent?: string;
  size?: "md" | "lg";
  footer?: React.ReactNode;
  className?: string;
  countDuration?: number;
}) {
  const n = useCountUp(value, { duration: countDuration });
  return (
    <Card className={cn("h-full", className)}>
      <CardBody className="flex h-full flex-col">
        <CardHead label={label} info={info} />
        <div
          className={cn(
            "mt-3 font-mono font-semibold tabular-nums tracking-tight",
            size === "lg" ? "text-[32px] leading-none sm:text-[40px]" : "text-[25px] leading-none",
            accent,
          )}
        >
          {render(n)}
        </div>
        {(delta !== undefined || sub) && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {delta !== undefined && <Delta value={delta} />}
            {sub && <span className="text-[12px] text-text-tertiary">{sub}</span>}
          </div>
        )}
        {footer && <div className="mt-auto pt-3">{footer}</div>}
      </CardBody>
    </Card>
  );
}
