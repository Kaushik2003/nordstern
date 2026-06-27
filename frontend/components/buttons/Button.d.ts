import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to fill the container width. @default false */
  fullWidth?: boolean;
  /** Icon node rendered before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Primary call-to-action. Pill-shaped, scales on hover/press.
 * @startingPoint section="Buttons" subtitle="Pill CTA with 4 variants" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
