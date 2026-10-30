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
    <li className="flex gap-3 text-left">
      <span className="mt-0.5 flex h-6 min-w-11 shrink-0 items-center justify-center rounded-md bg-sky-400/10 px-1.5 text-xs font-bold text-sky-300 ring-1 ring-sky-400/30">
        {prefix}
        {n}
      </span>
      <span className="text-sm leading-6 text-slate-300">{text}</span>
    </li>
  );
}

/** Programme objectives & outcomes as dark navy cards with a round badge, on a white section. */
export function OutcomesSection({ dept }: { dept: Department }) {
  const groups = [
    { key: "peo", short: "PEOs", title: "Program Educational Objectives", prefix: "PEO", icon: Target, items: dept.peos },
    { key: "po", short: "POs", title: "Program Outcomes", prefix: "PO", icon: ListChecks, items: dept.pos },
    { key: "pso", short: "PSOs", title: "Program Specific Outcomes", prefix: "PSO", icon: Sparkles, items: dept.psos },
    { key: "obj", short: "Goals", title: "Department Objectives", prefix: "O", icon: Flag, items: dept.objectives },
  ].filter((g) => g.items.length > 0);
  if (!groups.length) return null;

  return (
    <section id="outcomes" aria-labelledby="outcomes-heading" className="relative isolate scroll-mt-16 overflow-hidden bg-white py-16 lg:py-20">
      <Container className="text-center">
        <h2 id="outcomes-heading" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          Programme Objectives &amp;{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text text-transparent">Outcomes</span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">What our graduates are prepared to achieve, and the abilities they gain through the programme.</p>
      </Container>

      <Container className={cn("mx-auto mt-12 grid gap-6 sm:grid-cols-2", GRID_COLS[groups.length])}>
        {groups.map(({ key, short, title, prefix, icon: Icon, items }) => (
          <article
            key={key}
            className="group relative flex flex-col rounded-2xl bg-gradient-to-br from-[#0a1128] to-[#020817] text-center text-white shadow-xl shadow-slate-900/30 ring-1 ring-sky-400/15 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-sky-900/40 hover:ring-sky-400/40"
          >
            {/* Badge: round icon on a white band (the section colour) that cuts across the card, like the reference. */}
            <div className="relative flex justify-center pt-6">
              <div className="absolute inset-x-0 top-[3.25rem] h-7 bg-white" aria-hidden />
              <div className="relative flex size-28 flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#0f1d45] to-[#020817] text-sky-300 shadow-lg shadow-sky-500/30 ring-4 ring-white transition-transform duration-300 group-hover:scale-105">
                <Icon className="size-8" strokeWidth={1.75} aria-hidden />
                <span className="mt-1 text-sm font-extrabold tracking-wider text-white">{short}</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col px-6 pb-7 pt-5">
              {/* Fixed two-line slot: titles that wrap and titles that fit start their content at the same height. */}
              <h3 className="flex min-h-14 items-center justify-center font-heading text-lg font-extrabold uppercase leading-7 tracking-wide text-white">{title}</h3>
              <div className="mx-auto mt-3 h-0.5 w-16 rounded-full bg-gradient-to-r from-sky-300 to-cta" aria-hidden />
              <ul className="mt-5 space-y-3">
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
                  <ul className="mt-3 space-y-3">
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
