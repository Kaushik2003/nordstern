import * as React from "react";

export interface DialogProps {
  /** Controls visibility. */
  open: boolean;
  /** Called on overlay click / dismiss. */
  onClose?: () => void;
  /** Title rendered at the top. */
  title?: string;
  /** Max width in px. 420 for a dialog, 350 for a compact connect box. @default 420 */
  width?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Centered modal with overlay backdrop and bouncy scale-in. */
export function Dialog(props: DialogProps): JSX.Element | null;
