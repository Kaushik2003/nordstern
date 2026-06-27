import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. @default "brand" */
  tone?: "brand" | "success" | "warning" | "error" | "info" | "neutral";
  children?: React.ReactNode;
}

/** Small pill label for status and counts. */
export function Badge(props: BadgeProps): JSX.Element;
