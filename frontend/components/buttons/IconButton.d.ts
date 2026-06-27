import * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "surface" */
  variant?: "surface" | "brand" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Circular when true, 16px rounded square when false. @default true */
  round?: boolean;
  /** Required for accessibility. */
  "aria-label": string;
  children?: React.ReactNode;
}

/** Square/circular single-icon button for toolbars and card actions. */
export function IconButton(props: IconButtonProps): JSX.Element;
