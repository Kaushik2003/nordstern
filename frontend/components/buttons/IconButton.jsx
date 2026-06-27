import React from "react";

/**
 * IconButton — square/circular button for a single icon.
 * Use in toolbars, nav, card actions.
 */
export function IconButton({
  variant = "surface",
  size = "md",
  round = true,
  disabled = false,
  "aria-label": ariaLabel,
  style = {},
  children,
  ...props
}) {
  const sizes = { sm: 32, md: 40, lg: 48 };
  const dim = sizes[size];

  const variants = {
    surface: {
      background: "var(--color-bg-surface-2)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border)",
    },
    brand: {
      background: "var(--color-brand-500)",
      color: "#1A1A1A",
      border: "1px solid transparent",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text-secondary)",
      border: "1px solid transparent",
    },
  };

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: dim,
    height: dim,
    borderRadius: round ? "var(--radius-full)" : "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "transform var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)",
    WebkitTapHighlightColor: "transparent",
    ...variants[variant],
    ...style,
  };

  return (
    <button
      aria-label={ariaLabel}
      style={base}
      disabled={disabled}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = "scale(1.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.92)")}
      onMouseUp={(e) => !disabled && (e.currentTarget.style.transform = "scale(1.08)")}
      {...props}
    >
      {children}
    </button>
  );
}
