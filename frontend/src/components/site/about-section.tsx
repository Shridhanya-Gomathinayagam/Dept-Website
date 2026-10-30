import { Award, Building2, CalendarCheck, CheckCircle2, Eye, Rocket } from "lucide-react";
import type { Department } from "@/lib/types";
import { TextBlock } from "./common";
import { OutcomesSection } from "./outcomes-section";
import { WaveDivider } from "./wave-divider";

// Outer padding of the full-bleed panels: slim side margins; content spreads up to 96rem before they grow.
const EDGE = "max(2rem, calc((100vw - 96rem) / 2 + 2rem))";

/** Bullseye emblem sitting on the split between the two panels (decorative). */
function Bullseye() {
  return (
    // The whole target (rings and arrow) tilts right-to-left in 3D, like a hanging board taking the hit.
    <div className="relative animate-[target-tilt_3s_ease-in-out_infinite] motion-reduce:animate-none" aria-hidden>
      <Rings />
      {/* Arrow hitting the centre: shaft from top-right, head at the middle, fletching past the outer ring. */}
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full overflow-visible drop-shadow-[3px_4px_3px_rgba(2,8,23,0.35)]">
        <g fill="#05070d" stroke="#05070d" strokeLinejoin="round">
          <line x1="51" y1="49" x2="99.9" y2="0.1" strokeWidth="4.2" strokeLinecap="round" />
          <polygon points="49.2,50.8 60.3,46.3 53.7,39.7" strokeWidth="1.2" />
          <polygon points="82.8,17.2 101.5,-1.5 109.3,1.6 90.6,20.4" strokeWidth="1" />
          <polygon points="82.8,17.2 101.5,-1.5 98.4,-9.3 79.6,9.4" strokeWidth="1" />
        </g>
        {/* Feather barbs */}
        <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.05">
          <line x1="87.4" y1="12.6" x2="94.6" y2="15.6" />
          <line x1="92.1" y1="7.9" x2="99.3" y2="10.9" />
          <line x1="96.8" y1="3.2" x2="104" y2="6.2" />
          <line x1="87.4" y1="12.6" x2="84.4" y2="5.4" />
          <line x1="92.1" y1="7.9" x2="89.1" y2="0.7" />
          <line x1="96.8" y1="3.2" x2="93.8" y2="-4" />
        </g>
      </svg>
    </div>
  );
}

function Rings() {
  return (
    <div className="flex size-56 items-center justify-center rounded-full bg-white p-3 shadow-2xl shadow-sky-950/20 xl:size-64">
      <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-sky-300 to-cta p-5">
        <div className="flex size-full items-center justify-center rounded-full bg-white p-3">
          <div className="flex size-full items-center justify-center rounded-full bg-band p-3">
            <div className="flex size-full items-center justify-center rounded-full bg-white p-3">
              <div className="flex size-full items-center justify-center rounded-full bg-band p-2.5">
                <div className="size-full rounded-full bg-cta shadow-[0_0_18px] shadow-sky-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** About the department (dark panel) beside vision & mission (light panel), then outcomes and facilities. */
export function AboutSection({ dept }: { dept: Department }) {
  const facts = [
    dept.year_established && { icon: CalendarCheck, label: "Established", value: String(dept.year_established) },
    dept.accreditation && { icon: Award, label: "Accreditation", value: dept.accreditation },
    dept.recognition && { icon: Building2, label: "Recognition", value: dept.recognition },
  ].filter(Boolean) as { icon: typeof Award; label: string; value: string }[];
  const hasVisionMission = Boolean(dept.vision) || dept.mission.length > 0;

  return (
    <>
      {/* Top padding (pt-24 / sm:pt-32) keeps content below the WaveDivider that overlaps this section's top. */}
      <section id="about" aria-labelledby="about-heading" className={hasVisionMission ? "grid scroll-mt-16 lg:grid-cols-[45%_55%]" : "scroll-mt-16"}>
        {/* Left: about the department */}
        <div
          className="theme-dark relative isolate overflow-hidden bg-gradient-to-br from-[#0a1128] to-[#020817] pb-28 pl-4 pr-4 pt-24 sm:pb-36 sm:pl-6 sm:pr-6 sm:pt-32 lg:pb-40 lg:pl-(--edge) lg:pr-32 xl:pr-36"
          style={{ "--edge": EDGE } as React.CSSProperties}
        >
          <div className="pointer-events-none absolute -left-24 top-10 -z-10 size-96 rounded-full bg-sky-500/15 mix-blend-screen blur-3xl" aria-hidden />
          <h2 id="about-heading" className="font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            About the{" "}
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-cyan-400 to-sky-500 bg-clip-text text-transparent">Department</span>
          </h2>
          {dept.overview && <TextBlock text={dept.overview} className="mt-6 text-muted-foreground" />}
          {facts.length > 0 && (
            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start gap-3 rounded-xl border border-sky-400/20 bg-white/5 p-4 backdrop-blur transition hover:border-sky-300/50 hover:bg-white/10">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sky-400/10 ring-1 ring-sky-400/30">
                    <f.icon className="size-5 text-sky-300" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                    <dd className="mt-0.5 whitespace-pre-line font-semibold">{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Right: vision & mission, with the bullseye on the split line */}
        {hasVisionMission && (
          <div
            id="vision"
            className="relative flex scroll-mt-16 items-stretch bg-muted pb-28 pl-4 pr-4 pt-12 sm:pb-36 sm:pl-6 sm:pr-6 lg:pb-40 lg:pl-32 lg:pt-32 lg:pr-(--edge) xl:pl-36"
            style={{ "--edge": EDGE } as React.CSSProperties}
          >
            <div className="absolute left-0 top-[calc(50%+2.5rem)] z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
              <Bullseye />
            </div>
            {/* The cards fill the panel top to bottom: each keeps its content height and the spare
                space is shared between them (auto rows stretch), so no empty band is left above or below. */}
            <div className="grid w-full gap-5">
              {dept.vision && (
                <article className="group flex gap-4 rounded-2xl border bg-card p-6 shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Eye className="size-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-heading text-xl font-bold">Our Vision</h3>
                    <TextBlock text={dept.vision} className="mt-2 text-muted-foreground" />
                  </div>
                </article>
              )}
              {dept.mission.length > 0 && (
                // Highlighted card.
                <article className="group flex gap-4 rounded-2xl bg-cta p-6 text-cta-foreground shadow-xl shadow-sky-500/25 transition hover:-translate-y-0.5 sm:p-7">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/30">
                    <Rocket className="size-6" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-heading text-xl font-bold text-cta-foreground">Our Mission</h3>
                    <ul className="mt-3 space-y-2.5">
                      {dept.mission.map((m, i) => (
                        <li key={i} className="flex gap-2.5 leading-7">
                          <CheckCircle2 className="mt-1 size-5 shrink-0" aria-hidden />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              )}
            </div>
          </div>
        )}
      </section>

      {/* The white Outcomes section rises into the bottom of the About panels (needs their extra bottom padding). */}
      <WaveDivider id="about-outcomes" flip fill="#ffffff" />
      <OutcomesSection dept={dept} />
    </>
  );
}
