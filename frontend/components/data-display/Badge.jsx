import React from "react";

/**
 * Badge — small pill label. Brand by default, or a semantic tone.
 */
export function Badge({ tone = "brand", style = {}, children, ...props }) {
  const tones = {
    brand:   { bg: "rgba(171, 159, 242, 0.16)", fg: "var(--color-brand-500)" },
    success: { bg: "var(--color-success-fill)", fg: "var(--color-success)" },
    warning: { bg: "var(--color-warning-fill)", fg: "var(--color-warning)" },
    error:   { bg: "var(--color-error-fill)",   fg: "var(--color-error)" },
    info:    { bg: "var(--color-info-fill)",     fg: "var(--color-info)" },
    neutral: { bg: "var(--color-bg-surface-2)",  fg: "var(--color-text-secondary)" },
  };
  const t = tones[tone] || tones.brand;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "var(--radius-full)",
        background: t.bg,
        color: t.fg,
        fontFamily: "var(--font-display)",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: "18px",
        whiteSpace: "nowrap",
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
