import React from "react";

/**
 * Avatar — circular image or initials with a subtle brand ring.
 */
export function Avatar({ src, alt = "", initials, size = 40, ring = true, style = {} }) {
  const base = {
    width: size,
    height: size,
    borderRadius: "var(--radius-full)",
    border: ring ? "1px solid var(--color-border)" : "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "var(--color-brand-900)",
    color: "var(--color-brand-100)",
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: Math.round(size * 0.4),
    flexShrink: 0,
    ...style,
  };

  return (
    <span style={base}>
      {src ? (
        <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </span>
  );
}
