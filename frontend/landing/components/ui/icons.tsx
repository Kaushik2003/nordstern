import { type SVGProps } from "react";

/**
 * Minimal in-house icon set (replaces lucide-react). All icons inherit
 * `currentColor` and a 1.8 stroke, sized 1em by default so they scale with
 * font-size. Add here rather than pulling a dependency.
 */
function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export const ArrowUpRight = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Svg>
);

export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

export const Plus = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const Check = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m20 6-11 11-5-5" />
  </Svg>
);

export const Bank = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 21h18M4 10h16M5 10 12 4l7 6M6 10v11M18 10v11M10 10v11M14 10v11" />
  </Svg>
);

export const Shield = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10ZM9 12l2 2 4-4" />
  </Svg>
);

export const Users = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
  </Svg>
);

export const Bolt = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
  </Svg>
);

export const Grid = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
  </Svg>
);

export const Chart = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-6M22 20H2" />
  </Svg>
);

export const Gear = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
  </Svg>
);

export const ChevronRight = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);

export const ArrowDownLeft = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M17 7 7 17M15 17H7V9" />
  </Svg>
);

export const Eye = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
);

export const Dots = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </Svg>
);

export const Contactless = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M8.5 8a6 6 0 0 1 0 8M12 5.5a10 10 0 0 1 0 13M5 10.5a3 3 0 0 1 0 3" />
  </Svg>
);

export const Code = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
  </Svg>
);

export const Book = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 0 2 2h13" />
  </Svg>
);

export const Box = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 2 4 6.5v11L12 22l8-4.5v-11ZM4 6.5 12 11l8-4.5M12 22V11" />
  </Svg>
);

export const Activity = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 12h4l3 8 4-16 3 8h4" />
  </Svg>
);

export const Rocket = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M5 15c-1.5 1-2 4-2 4s3-.5 4-2M9 13a10 10 0 0 1 8-9c1 4-1 7-4 9M9 13l2 2M15 5l4 4M9 13l-3 1 1-4" />
  </Svg>
);

export const Layers = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="m12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
  </Svg>
);

export const Search = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Svg>
);

export const Bell = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Svg>
);
