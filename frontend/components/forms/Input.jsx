import React from "react";

/**
 * Input — text field with optional label, helper, and error state.
 */
export function Input({
  label,
  helperText,
  error = false,
  leadingIcon = null,
  trailingIcon = null,
  id,
  style = {},
  ...props
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();

  const wrap = {
    background: "var(--color-bg-surface)",
    border: `1px solid ${error ? "var(--color-error)" : focused ? "var(--color-brand-500)" : "var(--color-border)"}`,
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxShadow: focused && !error ? "var(--shadow-glow)" : "none",
    transition: "border var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard)",
  };

  const field = {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 15,
    lineHeight: "22px",
    minWidth: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </label>
      )}
      <div style={wrap}>
        {leadingIcon}
        <input
          id={inputId}
          style={field}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {trailingIcon}
      </div>
      {helperText && (
        <span
          style={{
            fontSize: 13,
            lineHeight: "18px",
            color: error ? "var(--color-error)" : "var(--color-text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
}
