import { cn } from "@/lib/cn";

const palette = [
  "bg-[rgba(171,159,242,0.18)] text-brand",
  "bg-[rgba(46,192,139,0.16)] text-pos",
  "bg-[rgba(125,184,242,0.16)] text-cool",
  "bg-[rgba(242,184,75,0.16)] text-warn",
  "bg-[rgba(255,140,115,0.16)] text-neg",
  "bg-[rgba(199,190,247,0.16)] text-brand-300",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  initials,
  size = 28,
  className,
}: {
  name: string;
  initials?: string;
  size?: number;
  className?: string;
}) {
  const ini = initials ?? name.slice(0, 2).toUpperCase();
  const tone = palette[hash(name) % palette.length];
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-sans font-semibold leading-none",
        tone,
        className,
      )}
      aria-hidden
    >
      {ini}
    </span>
  );
}
