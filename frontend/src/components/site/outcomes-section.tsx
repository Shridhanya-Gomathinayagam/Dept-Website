"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Flag, ListChecks, Sparkles, Target } from "lucide-react";
import type { Department } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Container } from "./common";

const VISIBLE = 4; // items shown before "Show all"

const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1 lg:max-w-sm",
  2: "lg:grid-cols-2 lg:max-w-3xl",
  3: "lg:grid-cols-3 lg:max-w-6xl",
  4: "lg:grid-cols-4",
};

function Item({ prefix, n, text }: { prefix: string; n: number; text: string }) {
  return (
    <li className="group/item flex gap-3 text-left transition-all duration-200 hover:bg-white/5 hover:translate-x-1 p-1.5 rounded-xl">
      <span className="mt-0.5 flex h-6 min-w-11 shrink-0 items-center justify-center rounded-md bg-sky-400/10 px-1.5 text-xs font-bold text-sky-300 ring-1 ring-sky-400/30 transition-colors duration-200 group-hover/item:bg-sky-400 group-hover/item:text-slate-950 group-hover/item:ring-sky-300">
        {prefix}
        {n}
      </span>
      <span className="text-sm leading-6 text-slate-300 transition-colors duration-200 group-hover/item:text-white">
        {text}
      </span>
    </li>
  );
}

/** Programme objectives & outcomes as dark navy cards with a round badge, with scroll reveal & hover elevation. */
export function OutcomesSection({ dept }: { dept: Department }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const groups = [
    { key: "peo", short: "PEOs", title: "Program Educational Objectives", prefix: "PEO", icon: Target, items: dept.peos },
    { key: "po", short: "POs", title: "Program Outcomes", prefix: "PO", icon: ListChecks, items: dept.pos },
    { key: "pso", short: "PSOs", title: "Program Specific Outcomes", prefix: "PSO", icon: Sparkles, items: dept.psos },
    { key: "obj", short: "Goals", title: "Department Objectives", prefix: "O", icon: Flag, items: dept.objectives },
  ].filter((g) => g.items.length > 0);

  if (!groups.length) return null;

  return (
    <section
      ref={sectionRef}
      id="outcomes"
      aria-labelledby="outcomes-heading"
      className="relative isolate scroll-mt-16 overflow-hidden bg-white pt-8 pb-16 sm:pt-10 sm:pb-20 lg:pt-12 lg:pb-24"
    >
      {/* Subtle ambient glow in background that activates when scrolled in view */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 flex items-center justify-center transition-opacity duration-1000",
          isInView ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      >
        <div className="h-96 w-3/4 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <Container
        className={cn(
          "text-center transition-all duration-700 ease-out",
          isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <h2
          id="outcomes-heading"
          className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Programme Objectives &amp;{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text text-transparent">
            Outcomes
          </span>
        </h2>
        <p className="mx-auto mt-3.5 max-w-2xl text-muted-foreground sm:text-lg">
          What our graduates are prepared to achieve, and the abilities they gain through the programme.
        </p>
      </Container>

      <Container className={cn("mx-auto mt-12 grid gap-6 sm:grid-cols-2", GRID_COLS[groups.length])}>
        {groups.map(({ key, short, title, prefix, icon: Icon, items }, idx) => (
          <article
            key={key}
            style={{ transitionDelay: `${idx * 120}ms` }}
            className={cn(
              "group relative flex flex-col rounded-[1.75rem] bg-gradient-to-br from-[#0a1128] to-[#020817] text-center text-white shadow-xl shadow-slate-900/30 ring-1 ring-sky-400/20",
              "transition-all duration-700 ease-out",
              isInView
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-12 scale-[0.96]",
              "hover:-translate-y-3 hover:shadow-2xl hover:shadow-sky-950/60 hover:ring-2 hover:ring-sky-400"
            )}
          >
            {/* Badge: round icon on a white band that cuts across the card */}
            <div className="relative flex justify-center pt-6">
              <div className="absolute inset-x-0 top-[3.25rem] h-7 bg-white" aria-hidden />
              <div className="relative flex size-28 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#0f1d45] to-[#020817] text-sky-300 shadow-lg shadow-sky-500/30 ring-4 ring-white transition-all duration-300 group-hover:scale-110 group-hover:ring-sky-400 group-hover:shadow-[0_0_25px_rgba(56,189,248,0.6)]">
                <Icon className="size-8 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 text-sky-300" strokeWidth={1.75} aria-hidden />
                <span className="mt-1 text-sm font-extrabold tracking-wider text-white transition-colors duration-300 group-hover:text-sky-300">
                  {short}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-6 pb-7 pt-5">
              {/* Fixed two-line slot */}
              <h3 className="flex min-h-14 items-center justify-center font-heading text-lg font-extrabold uppercase leading-7 tracking-wide text-white transition-colors duration-300 group-hover:text-sky-200">
                {title}
              </h3>
              <div
                className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-sky-300 to-cta transition-all duration-300 group-hover:w-28 group-hover:shadow-[0_0_12px_rgba(14,165,233,0.8)]"
                aria-hidden
              />
              <ul className="mt-5 space-y-2">
                {items.slice(0, VISIBLE).map((t, i) => (
                  <Item key={i} prefix={prefix} n={i + 1} text={t} />
                ))}
              </ul>
              {items.length > VISIBLE && (
                <details className="group/more mt-3">
                  <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1 text-sm font-semibold text-sky-200 hover:underline [&::-webkit-details-marker]:hidden">
                    <span className="group-open/more:hidden">Show all {items.length}</span>
                    <span className="hidden group-open/more:inline">Show less</span>
                    <ChevronDown className="size-4 transition-transform group-open/more:rotate-180" aria-hidden />
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {items.slice(VISIBLE).map((t, i) => (
                      <Item key={i} prefix={prefix} n={VISIBLE + i + 1} text={t} />
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </article>
        ))}
      </Container>
    </section>
  );
}
