// design-sync stub for `next/image`.
// The DS bundle has no Next image optimizer/loader, so Image degrades to a
// plain <img>. Resolved in place of `next/image` via
// .design-sync/tsconfig.sync.json paths (see cfg.tsconfig). Handles the common
// prop surface (src object, fill, priority, sizes) and drops Next-only props.
import type { CSSProperties, ImgHTMLAttributes, ReactNode } from "react";

type StaticImport = { src: string; height?: number; width?: number };

type ImageProps = {
  src: string | StaticImport;
  alt?: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  placeholder?: string;
  blurDataURL?: string;
  loader?: unknown;
  unoptimized?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height">;

export default function Image({
  src,
  alt = "",
  width,
  height,
  fill,
  priority: _p,
  quality: _q,
  sizes,
  placeholder: _pl,
  blurDataURL: _b,
  loader: _l,
  unoptimized: _u,
  style,
  ...rest
}: ImageProps) {
  const url = typeof src === "string" ? src : src?.src ?? "";
  const fillStyle: CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : (style ?? {});
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={fill ? undefined : (width as number | undefined)}
      height={fill ? undefined : (height as number | undefined)}
      sizes={sizes}
      style={fillStyle}
      {...rest}
    />
  );
}
