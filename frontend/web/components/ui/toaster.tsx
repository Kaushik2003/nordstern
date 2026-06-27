"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      theme="dark"
      gap={10}
      offset={18}
      toastOptions={{
        className: "ns-toast",
        style: {
          background: "var(--color-surface-3)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "12px",
          color: "var(--color-text-primary)",
          fontSize: "13px",
          fontFamily: "var(--font-sans)",
          boxShadow: "var(--shadow-lg)",
        },
      }}
      style={
        {
          "--normal-bg": "var(--color-surface-3)",
          "--normal-text": "var(--color-text-primary)",
          "--normal-border": "var(--color-border-default)",
        } as React.CSSProperties
      }
    />
  );
}
