import { cn } from "@/lib/cn";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] border border-border-default bg-surface-2 px-1",
        "font-mono text-[10.5px] font-medium text-text-tertiary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
