import * as React from "react";

export interface AlertProps {
  /** Semantic tone. @default "info" */
  tone?: "success" | "warning" | "error" | "info";
  /** Bold title line. */
  title?: string;
  /** Leading icon node. */
  icon?: React.ReactNode;
  /** Show a dismiss button when provided. */
  onClose?: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Inline alert / toast with a left accent border and tint fill. */
export function Alert(props: AlertProps): JSX.Element;
