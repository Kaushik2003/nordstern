import React from "react";

/**
 * Card — soft, rounded surface. Optionally interactive (lifts on hover).
 */
export function Card({ interactive = false, padding = 28, style = {}, children, ...props }) {
  const base = {
    background: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border)",
    padding,
    boxShadow: "var(--shadow-md)",
    transition: "transform var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
    cursor: interactive ? "pointer" : "default",
    ...style,
  };

  return (
    <div
      style={base}
      onMouseEnter={(e) => {
        if (!interactive) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--shadow-lg)";
      }}
      onMouseLeave={(e) => {
        if (!interactive) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      {...props}
    >
      {children}
    </div>
  );
}
