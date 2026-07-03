import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";
import { markDataUri } from "@/lib/brand-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Browser-tab favicon: NordStern mark on an ink tile (high contrast at 16–32px). */
export default function Icon() {
  return new ImageResponse(
    (
      <img width={32} height={32} src={markDataUri()} alt="" />
    ),
    { ...size },
  );
}
