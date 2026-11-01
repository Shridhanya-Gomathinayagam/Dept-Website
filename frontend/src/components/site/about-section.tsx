import { ArrowUpRight, Check, CircleDot } from "lucide-react";
import type { Department } from "@/lib/types";
import { Container } from "./common";
import { OutcomesSection } from "./outcomes-section";

const DEFAULT_TAGS = [
  "Artificial Intelligence",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "Generative AI",
];

const DEFAULT_PARA_1 =
  "The Department of Computer Science and Engineering (Artificial Intelligence and Machine Learning) at KPR Institute of Engineering and Technology excels in education, research, and innovation.";

const DEFAULT_PARA_2 =
  "Our curriculum combines core computing with hands-on projects, industry collaborations, advanced laboratories, and experienced faculty.";

const DEFAULT_VISION =
  "To be a centre of excellence in computing education and research.";

const DEFAULT_MISSION = [
  "Provide quality education in computer science",
  "Foster research, innovation and entrepreneurship",
  "Develop ethical professionals who serve society",
];

export function AboutSection({ dept }: { dept: Department }) {
  // Extract paragraphs cleanly from overview or fallback
  const overviewParas = dept.overview
    ? dept.overview
        .split(/\r?\n\s*\r?\n/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  const para1 = overviewParas[0] || dept.intro || DEFAULT_PARA_1;
  const para2 = overviewParas[1] || DEFAULT_PARA_2;

  const visionText = dept.vision || DEFAULT_VISION;
  const missionItems = dept.mission && dept.mission.length > 0 ? dept.mission : DEFAULT_MISSION;

  return (
    <>
      <section
        id="about"
        aria-labelledby="about-heading"
        className="relative scroll-mt-16 bg-white pb-6 pt-16 sm:pb-8 sm:pt-20 lg:pb-10 lg:pt-24"
      >
        <Container>
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-20">
            {/* Left Column: Descriptive info & tags */}
            <div className="lg:col-span-7">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0369a1] sm:text-sm">
                About the Department
              </p>

              <h2
                id="about-heading"
                className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-[#0a1128] sm:text-4xl lg:text-[2.75rem] lg:leading-[1.16]"
              >
                Turning ideas into{" "}
                <span className="text-[#0284c7]">intelligent solutions</span>
              </h2>

              <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                <p>{para1}</p>
                <p>{para2}</p>
              </div>

              {/* Focus tags / technologies */}
              <div className="mt-7 flex flex-wrap gap-2.5">
                {DEFAULT_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-sky-200/60 bg-sky-100/70 px-4 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-200/70 sm:text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Column: Stacked Vision & Mission Cards with Hover Effects */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* Vision Card (White, top-accented, hover elevation & glow) */}
              <article className="group relative cursor-default overflow-hidden rounded-[1.75rem] border border-slate-200/90 border-t-[4px] border-t-sky-500 bg-white p-6 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-2 hover:border-sky-400 hover:shadow-2xl hover:shadow-sky-500/15 sm:p-8">
                {/* Accent line glow on hover */}
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-sky-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden
                />

                <div className="flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100/90 text-sky-600 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-sky-500 group-hover:text-white sm:size-12">
                    <CircleDot className="size-6 stroke-[2.2]" aria-hidden />
                  </div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-[#0369a1] sm:text-2xl">
                    Our Vision
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {visionText}
                </p>
              </article>

              {/* Mission Card (Midnight dark, glowing shadow, animated hover state) */}
              <article className="group relative cursor-default overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#020817] p-6 text-white shadow-2xl shadow-slate-950/40 transition-all duration-300 hover:-translate-y-2 hover:border-sky-400/50 hover:shadow-[0_25px_60px_-15px_rgba(14,165,233,0.3)] sm:p-8">
                {/* Soft ambient corner glow on hover */}
                <div
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-sky-500/15 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-40"
                  aria-hidden
                />

                <div className="relative flex items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#0ea5e9] text-slate-950 shadow-md shadow-sky-500/25 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:bg-white group-hover:shadow-sky-400/50 sm:size-12">
                    <ArrowUpRight className="size-6 stroke-[2.5]" aria-hidden />
                  </div>
                  <h3 className="font-heading text-xl font-bold tracking-tight text-white transition-colors duration-300 group-hover:text-sky-300 sm:text-2xl">
                    Our Mission
                  </h3>
                </div>

                <ul className="relative mt-6 space-y-3.5">
                  {missionItems.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 transition-transform duration-200 hover:translate-x-1.5"
                    >
                      <Check
                        className="mt-1 size-4.5 shrink-0 stroke-[2.5] text-[#38bdf8] transition-transform duration-200 group-hover:scale-110"
                        aria-hidden
                      />
                      <span className="text-sm leading-relaxed text-slate-200 sm:text-base">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </Container>
      </section>

      {/* Section Separator: Floating Target Badge (Design 5) with Dynamic Hover Interaction */}
      <div className="relative flex items-center justify-center py-2 bg-white">
        <a
          href="#outcomes"
          aria-label="Scroll to Programme Objectives & Outcomes"
          className="group/sep flex w-full items-center justify-center transition-all duration-300"
        >
          {/* Left horizontal line: illuminates from subtle slate to electric cyan glow */}
          <div className="h-[1.5px] flex-1 max-w-xs sm:max-w-md lg:max-w-xl bg-gradient-to-r from-transparent via-slate-200 to-slate-300 transition-all duration-500 group-hover/sep:via-sky-400 group-hover/sep:to-cyan-400 group-hover/sep:shadow-[0_0_8px_rgba(56,189,248,0.6)]" />

          {/* Central Target Badge: scales up, glows neon cyan and rotates on hover */}
          <div className="mx-4 sm:mx-6 flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-full bg-[#020817] shadow-md ring-4 ring-slate-100 transition-all duration-500 group-hover/sep:scale-125 group-hover/sep:rotate-45 group-hover/sep:ring-4 group-hover/sep:ring-sky-400 group-hover/sep:shadow-[0_0_30px_rgba(56,189,248,0.7)]">
            <div className="flex size-7 sm:size-8 items-center justify-center rounded-full border-2 border-sky-400/80 transition-all duration-500 group-hover/sep:border-cyan-200 group-hover/sep:scale-110">
              <div className="size-2.5 sm:size-3 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)] transition-all duration-500 group-hover/sep:scale-125 group-hover/sep:bg-white group-hover/sep:shadow-[0_0_15px_rgba(255,255,255,1)]" />
            </div>
          </div>

          {/* Right horizontal line: illuminates from subtle slate to electric cyan glow */}
          <div className="h-[1.5px] flex-1 max-w-xs sm:max-w-md lg:max-w-xl bg-gradient-to-l from-transparent via-slate-200 to-slate-300 transition-all duration-500 group-hover/sep:via-sky-400 group-hover/sep:to-cyan-400 group-hover/sep:shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
        </a>
      </div>

      {/* Program Educational Objectives & Outcomes */}
      <OutcomesSection dept={dept} />
    </>
  );
}
