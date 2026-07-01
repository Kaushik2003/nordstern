"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Heading, Text } from "@/components/ui/typography";
import { FadeSwap } from "@/components/motion/fade-swap";
import { useAutoRotate } from "@/components/motion/use-auto-rotate";
import { OUTCOMES } from "@/lib/content";

const items = OUTCOMES.items;

/**
 * Auto-rotating outcome pitch (label → title → description → CTA). Advances
 * every ~3.8s, pauses on hover/focus and resumes on leave. Height is reserved
 * so swapping content never shifts the layout below.
 */
export function OutcomeRotator() {
  const [paused, setPaused] = useState(false);
  const { index } = useAutoRotate(items.length, { intervalMs: 3800, paused });
  const item = items[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="min-h-[19rem] sm:min-h-[16rem]"
    >
      <FadeSwap activeKey={index}>
        <Eyebrow>{item.label}</Eyebrow>
        <Heading
          size="h3"
          className="mt-4 max-w-md text-[clamp(1.6rem,2.6vw,2.15rem)]"
        >
          {item.title}
        </Heading>
        <Text className="mt-4 max-w-md">{item.description}</Text>
        <Button href={item.cta.href} variant="primary" className="mt-7">
          {item.cta.label}
        </Button>
      </FadeSwap>
    </div>
  );
}
