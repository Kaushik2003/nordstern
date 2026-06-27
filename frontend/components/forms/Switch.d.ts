import * as React from "react";

export interface SwitchProps {
  /** @default false */
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Optional text label to the right of the track. */
  label?: string;
  id?: string;
  style?: React.CSSProperties;
}

/** On/off toggle with a brand-purple track and bouncy knob. */
export function Switch(props: SwitchProps): JSX.Element;
