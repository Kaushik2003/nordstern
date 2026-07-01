import Image from "next/image";
import { cn } from "@/lib/cn";
import { OUTCOMES } from "@/lib/content";

type GalleryItem = (typeof OUTCOMES.gallery)[number];

/**
 * One editorial tile. Renders a next/image when `src` is set, otherwise a
 * branded gradient placeholder at the same aspect ratio — so dropping in a real
 * image later is a one-line `src:` change with zero layout shift.
 */
function GalleryImage({
  img,
  className,
}: {
  img: GalleryItem;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] ring-1 ring-black/[0.06] shadow-[0_20px_50px_-30px_rgba(76,63,158,0.35)]",
        className,
      )}
      style={{ aspectRatio: img.ratio }}
    >
      {img.src ? (
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes="(min-width: 1024px) 28vw, 45vw"
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={img.alt}
          className={cn("h-full w-full bg-gradient-to-br", img.tone)}
        >
          {/* soft highlight so the placeholder reads intentional, not empty */}
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(120% 90% at 20% 10%, rgba(255,255,255,0.5), transparent 55%)",
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Two offset tiles of different sizes — editorial, not a gallery grid.
 *  Grid `fr` tracks (not flex) so the row can never overflow its container. */
export function OutcomeGallery() {
  const [lead, aside] = OUTCOMES.gallery;
  return (
    <div className="grid grid-cols-[1.4fr_1fr] items-start gap-4 sm:gap-5">
      <GalleryImage img={lead} className="min-w-0" />
      <GalleryImage img={aside} className="mt-10 min-w-0 sm:mt-14" />
    </div>
  );
}
