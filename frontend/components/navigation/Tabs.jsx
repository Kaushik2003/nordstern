import React from "react";

/**
 * Tabs — pill-container segmented nav. Active tab gets a brand-tint pill.
 */
export function Tabs({ tabs = [], value, onChange, style = {} }) {
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: "var(--color-bg-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-full)",
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const key = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab : tab.label;
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(key)}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--radius-full)",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 600,
              background: active ? "rgba(171, 159, 242, 0.16)" : "transparent",
              color: active ? "var(--color-brand-500)" : "var(--color-text-secondary)",
              transition: "background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
