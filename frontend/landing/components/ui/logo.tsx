import { cn } from "@/lib/cn";
import Image from "next/image";

/** NordStern logo mark. */
export function LogoMark({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const src = tone === "dark" ? "/logo-dark.png" : "/logo-light.png";
  return (
    <img 
      src={src} 
      alt="NordStern" 
      className={cn("h-10 w-10 object-contain rounded-[10px]", className)} 
    />
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark tone={tone} />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          tone === "dark" ? "text-ink" : "text-white",
        )}
      >
        NordStern
      </span>
    </span>
  );
}
