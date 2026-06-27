import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lift + deeper shadow on hover. @default false */
  interactive?: boolean;
  /** Inner padding in px. @default 28 */
  padding?: number;
  children?: React.ReactNode;
}

/**
 * Rounded surface container with purple-tinted shadow.
 * @startingPoint section="Layout" subtitle="Soft rounded surface card" viewport="700x200"
 */
export function Card(props: CardProps): JSX.Element;
