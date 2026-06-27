import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the input. */
  label?: string;
  /** Helper or error message rendered below. */
  helperText?: string;
  /** Error state — red border and helper text. @default false */
  error?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

/**
 * Text input with label, helper text, and focus glow.
 * @startingPoint section="Forms" subtitle="Labeled text field with states" viewport="700x150"
 */
export function Input(props: InputProps): JSX.Element;
