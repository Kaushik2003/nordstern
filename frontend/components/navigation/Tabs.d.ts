import * as React from "react";

export interface TabItem {
  value: string;
  label: string;
}

export interface TabsProps {
  /** Tab list — strings or {value,label} objects. */
  tabs: (string | TabItem)[];
  /** Currently selected tab value. */
  value: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

/** Pill-container segmented tabs; active tab gets a brand-tint pill. */
export function Tabs(props: TabsProps): JSX.Element;
