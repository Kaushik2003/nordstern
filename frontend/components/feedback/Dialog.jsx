import React from "react";

/**
 * Dialog — centered modal with overlay and bouncy enter.
 */
export function Dialog({ open, onClose, title, width = 420, style = {}, children }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 1000,
        animation: "phantom-fade var(--duration-base) var(--ease-standard)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "var(--color-bg-canvas)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          padding: 28,
          animation: "phantom-pop var(--duration-base) var(--ease-bounce)",
          ...style,
        }}
      >
        {title && (
          <h3 style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 22, lineHeight: "30px", color: "var(--color-text-primary)" }}>
            {title}
          </h3>
        )}
        {children}
        <style>{`
          @keyframes phantom-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes phantom-pop { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
          @media (prefers-reduced-motion: reduce) {
            @keyframes phantom-pop { from { opacity: 0 } to { opacity: 1 } }
          }
        `}</style>
      </div>
    </div>
  );
}
