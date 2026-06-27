import React from "react";

/**
 * Switch — on/off toggle with a friendly brand-purple track.
 */
export function Switch({ checked = false, onChange, disabled = false, label, id, style = {} }) {
  const switchId = id || React.useId();
  const track = {
    width: 44,
    height: 26,
    borderRadius: "var(--radius-full)",
    background: checked ? "var(--color-brand-500)" : "var(--color-border)",
    border: "none",
    padding: 3,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "background var(--duration-base) var(--ease-standard)",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
  };
  const knob = {
    width: 20,
    height: 20,
    borderRadius: "var(--radius-full)",
    background: "#FFFFFF",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    transform: checked ? "translateX(18px)" : "translateX(0)",
    transition: "transform var(--duration-base) var(--ease-bounce)",
  };

  const el = (
    <button
      id={switchId}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={track}
    >
      <span style={knob} />
    </button>
  );

  if (!label) return <span style={style}>{el}</span>;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer", ...style }}>
      {el}
      <span style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-text-primary)" }}>{label}</span>
    </label>
  );
}
