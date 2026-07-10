"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-[#15131f] font-semibold hover:bg-brand-600 active:bg-brand-700 shadow-[0_2px_18px_-4px_rgba(171,159,242,0.5)]",
  secondary:
    "bg-surface-2 text-text-primary border border-border-default hover:bg-surface-hover hover:border-border-strong",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-2",
  destructive: "border border-crit/45 text-crit hover:bg-crit hover:text-white hover:border-crit",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-[9px]",
  md: "h-[38px] px-4 text-[13px] gap-2 rounded-[10px]",
  lg: "h-11 px-5 text-[14.5px] gap-2 rounded-[11px]",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-sans tracking-tight transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-[spin_0.7s_linear_infinite]" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: number; active?: boolean }
>(function IconButton({ className, size = 36, active, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      style={{ width: size, height: size }}
      className={cn(
        "inline-grid place-items-center rounded-[10px] text-text-secondary transition-colors duration-150",
        "hover:bg-surface-2 hover:text-text-primary",
        active && "bg-brand-fill text-brand",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
