import React from "react";

/**
 * Phantom Button — the primary call-to-action primitive.
 * Pill-shaped, friendly, one accent color doing the work.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  children,
  ...props
}) {
  const sizes = {
    sm: { padding: "8px 18px", fontSize: 13 },
    md: { padding: "12px 28px", fontSize: 14 },
    lg: { padding: "16px 34px", fontSize: 16 },
  };

  const variants = {
    primary: {
      background: "var(--color-brand-500)",
      color: "#1A1A1A",
      border: "1.5px solid transparent",
    },
    secondary: {
      background: "transparent",
      color: "var(--color-text-primary)",
      border: "1.5px solid var(--color-border)",
    },
    destructive: {
      background: "var(--color-error)",
      color: "#FFFFFF",
      border: "1.5px solid transparent",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-brand-500)",
      border: "1.5px solid transparent",
    },
  };

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: "var(--radius-full)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    width: fullWidth ? "100%" : "auto",
    transition: "transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)",
    WebkitTapHighlightColor: "transparent",
    ...sizes[size],
    ...variants[variant],
    ...style,
  };

  const onEnter = (e) => {
    if (disabled) return;
    e.currentTarget.style.transform = "scale(1.02)";
    if (variant === "primary" || variant === "ghost")
      e.currentTarget.style.boxShadow = "var(--shadow-glow)";
  };
  const onLeave = (e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "none";
  };
  const onDown = (e) => {
    if (disabled) return;
    e.currentTarget.style.transform = "scale(0.97)";
  };
  const onUp = (e) => {
    if (disabled) return;
    e.currentTarget.style.transform = "scale(1.02)";
  };

  return (
    <button
      style={base}
      disabled={disabled}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={onDown}
      onMouseUp={onUp}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
