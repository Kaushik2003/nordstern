import { cn } from "@/lib/cn";

/** NordStern mark — a porthole ring with a purple liquid fill and a
 *  north-star comet streak. Crisp, themeable SVG (ring uses currentColor). */
export function BrandMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={cn("text-brand-100", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="ns-liquid" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8B7EE0" />
          <stop offset="1" stopColor="#C7BEF7" />
        </linearGradient>
        <clipPath id="ns-clip">
          <circle cx="16" cy="16" r="12.4" />
        </clipPath>
      </defs>
      <g clipPath="url(#ns-clip)">
        <path d="M1 20 C 6 16.5, 10 21.5, 16 19.6 S 26 16, 31 20.5 L 31 31 L 1 31 Z" fill="url(#ns-liquid)" />
        <path d="M1 23 C 7 20.4, 11 24.6, 17 22 S 27 19.4, 31 22.6 L 31 31 L 1 31 Z" fill="#AB9FF2" opacity="0.5" />
      </g>
      <circle cx="16" cy="16" r="12.4" stroke="currentColor" strokeWidth="2.1" />
      <path d="M11.5 20.5 L 24.4 8.2 L 21.6 13.4 Z" fill="#EAE6FF" />
      <path d="M24.8 6.8 l1.05 2.35 2.35 1.05 -2.35 1.05 -1.05 2.35 -1.05 -2.35 -2.35 -1.05 2.35 -1.05 Z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({
  size = 26,
  className,
  textClassName,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark size={size} />
      <span className={cn("font-display text-[16px] font-semibold tracking-tight text-text-primary", textClassName)}>
        Nord<span className="text-brand">Stern</span>
      </span>
    </span>
  );
}
