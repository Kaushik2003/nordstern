// design-sync stub for `next/link`.
// The DS bundle renders standalone (no Next router), so Link degrades to a
// plain <a>. Resolved in place of `next/link` via .design-sync/tsconfig.sync.json
// paths (see cfg.tsconfig). Behaviour parity: renders children in an anchor,
// forwards className/style/onClick/etc; Next-only props are dropped.
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = {
  href?: string | { pathname?: string } | null;
  children?: ReactNode;
  // Next-only props we accept and ignore so spreads don't leak them to the DOM.
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  passHref?: boolean;
  locale?: string | false;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export default function Link({
  href,
  children,
  prefetch: _p,
  replace: _r,
  scroll: _s,
  shallow: _sh,
  passHref: _ph,
  locale: _l,
  ...rest
}: LinkProps) {
  const url =
    typeof href === "string" ? href : href && "pathname" in href ? href.pathname : "#";
  return (
    <a href={url ?? "#"} {...rest}>
      {children}
    </a>
  );
}
