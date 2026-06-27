import React from "react";

/**
 * Alert / Toast — left-icon message with a semantic accent border.
 */
export function Alert({ tone = "info", title, icon = null, onClose, style = {}, children }) {
  const tones = {
    success: { fill: "var(--color-success-fill)", line: "var(--color-success)" },
    warning: { fill: "var(--color-warning-fill)", line: "var(--color-warning)" },
    error:   { fill: "var(--color-error-fill)",   line: "var(--color-error)" },
    info:    { fill: "var(--color-info-fill)",     line: "var(--color-info)" },
  };
  const t = tones[tone] || tones.info;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        background: t.fill,
        borderRadius: "var(--radius-lg)",
        borderLeft: `3px solid ${t.line}`,
        ...style,
      }}
    >
      {icon && <span style={{ color: t.line, display: "inline-flex", flexShrink: 0, marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)", marginBottom: children ? 2 : 0 }}>
            {title}
          </div>
        )}
        {children && (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: "20px", color: "var(--color-text-secondary)" }}>
            {children}
          </div>
        )}
      </div>
      {onClose && (
        <button
          aria-label="Dismiss"
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
}
