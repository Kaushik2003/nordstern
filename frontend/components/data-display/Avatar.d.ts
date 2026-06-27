import * as React from "react";

export interface AvatarProps {
  /** Image URL. Falls back to initials when absent. */
  src?: string;
  alt?: string;
  /** Initials shown when no image. */
  initials?: string;
  /** Diameter in px. @default 40 */
  size?: 24 | 32 | 40 | 48 | number;
  /** Show a 1px border ring. @default true */
  ring?: boolean;
  style?: React.CSSProperties;
}

/** Circular avatar — image or initials with a subtle ring. */
export function Avatar(props: AvatarProps): JSX.Element;
