"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";

// Positions the three circles rotate through (percent of the square collage box).
// Slot 0 is the highlighted front circle; the others sit smaller and dimmer behind it.
const SLOTS = [
  { left: "0%", top: "14%", size: "70%", z: 30, front: true },
  { left: "56%", top: "0%", size: "44%", z: 20, front: false },
  { left: "54%", top: "56%", size: "42%", z: 10, front: false },
];
const INTERVAL_MS = 1700;

interface Props {
  /** Admin-uploaded hero image; when null the built-in default is used. */
  mainSrc: string | null;
  defaultSrc: string;
  /** Built-in second and third images (public/ paths), square with all content inside the inscribed circle. */
  secondSrc: string;
  thirdSrc: string;
}

/** Hero visual: three overlapping circles that take turns coming to the front. */
export function HeroCollage({ mainSrc, defaultSrc, secondSrc, thirdSrc }: Props) {
  const [turn, setTurn] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setTurn((t) => (t + 1) % SLOTS.length), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const circles = [
    mainSrc ? (
      <SmartImage key="main" src={mainSrc} alt="" width={720} priority className="h-full w-full object-cover" />
    ) : (
      <Image key="main" src={defaultSrc} alt="" fill priority sizes="(min-width: 1024px) 360px, 70vw" className="object-cover" />
    ),
    <Image key="second" src={secondSrc} alt="" fill sizes="(min-width: 1024px) 360px, 70vw" className="object-cover" />,
    <Image key="third" src={thirdSrc} alt="" fill sizes="(min-width: 1024px) 360px, 70vw" className="object-cover" />,
  ];

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-md lg:max-w-lg"
      aria-hidden
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-[4%] animate-[spin_40s_linear_infinite] rounded-full border border-dashed border-sky-400/20" />
      {circles.map((content, i) => {
        const slot = SLOTS[(i - turn + SLOTS.length) % SLOTS.length];
        return (
          <div
            key={i}
            className={cn(
              "absolute aspect-square overflow-hidden rounded-full transition-all duration-600 ease-in-out motion-reduce:transition-none",
              slot.front
                ? "opacity-100 shadow-[0_0_70px_-8px] shadow-sky-400/60 ring-2 ring-sky-300/70"
                : "opacity-60 brightness-75 ring-4 ring-[#0a1128]",
            )}
            style={{ left: slot.left, top: slot.top, width: slot.size, zIndex: slot.z }}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
