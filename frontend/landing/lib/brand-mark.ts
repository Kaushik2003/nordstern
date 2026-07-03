import fs from "fs";
import path from "path";
import { siteConfig } from "./site";

const { brand, brandRing } = siteConfig.colors;

/**
 * NordStern comet / north-star mark as a raw SVG string. Rendered by ImageResponse
 * routes (OG image, icons) as a data-URI <img>, since those run outside the
 * Tailwind/React-component runtime. `ring` overrides the outline for dark grounds.
 */
export function markSvg(ring: string = brandRing): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="17" stroke="${ring}" stroke-width="3"/><path d="M41 7C31 15 25.5 19 19.5 27c-3.4 4.6-2.6 8.4 2.4 6.6C28 31.3 33.8 23.5 41 7Z" fill="${brand}"/></svg>`;
}

/** Base64 data URI for use as an <img src> inside ImageResponse. */
export function markDataUri(ring?: string): string {
  // If ring is white (representing dark mode background), use the light logo (white ring)
  const isLightLogo = ring === "#ffffff" || ring === "white";
  const filename = isLightLogo ? "logo-light.png" : "logo-dark.png";

  try {
    const filePath = path.join(process.cwd(), "public", filename);
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    // Fallback to SVG if file-read fails (e.g. build environments)
    const b64 = Buffer.from(markSvg(ring)).toString("base64");
    return `data:image/svg+xml;base64,${b64}`;
  }
}
