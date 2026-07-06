"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white font-semibold hover:bg-brand-800 active:bg-brand-900 shadow-sm",
  secondary:
    "bg-white text-text-primary border border-black/[0.08] hover:bg-surface-2 hover:border-black/[0.15] shadow-xs",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-2",
  destructive: "border border-neg/30 text-neg hover:bg-neg hover:text-white hover:border-neg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12px] gap-1.5 rounded-full",
  md: "h-[38px] px-4 text-[13px] gap-2 rounded-full",
  lg: "h-11 px-5.5 text-[14px] gap-2 rounded-full",
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
        "inline-grid place-items-center rounded-full text-text-secondary transition-colors duration-150",
        "hover:bg-surface-2 hover:text-text-primary border border-transparent hover:border-black/[0.04]",
        active && "bg-brand-fill text-brand border-brand/20",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
