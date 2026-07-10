"use client";

import { forwardRef } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-[38px] w-full rounded-[10px] border border-border-default bg-surface-2 px-3 text-[13px] text-text-primary",
          "placeholder:text-text-tertiary transition-colors",
          "focus:border-brand/60 focus:outline-none focus:ring-[3px] focus:ring-[rgba(171,159,242,0.22)]",
          className,
        )}
        {...props}
      />
    );
  },
);

export function SearchInput({
  className,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
      <Input className={cn("pl-9", inputClassName)} {...props} />
    </div>
  );
}
