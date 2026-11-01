import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Award, CalendarDays, FileText, Globe, GraduationCap, Play, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Department, HomeData, Mou, Page, Video } from "@/lib/types";
import { isSafeUrl } from "@/lib/format";
import { getDepartment } from "@/lib/site";
import { Container } from "@/components/site/common";
import { AboutSection } from "@/components/site/about-section";
import { HeroCollage } from "@/components/site/hero-collage";
import { MousSection } from "@/components/site/mous-section";
import { SmartImage } from "@/components/site/smart-image";

export async function generateMetadata(): Promise<Metadata> {
  const dept = await getDepartment();
  const title = dept ? `${dept.name}${dept.college_name ? ` | ${dept.college_name}` : ""}` : "Department Digital Hub";
  return {
    title,
    description: dept?.tagline ?? dept?.intro?.slice(0, 160) ?? "Department website",
    openGraph: { title, description: dept?.tagline ?? undefined, images: dept?.hero_image_url ? [dept.hero_image_url] : [] },
  };
}

// Default main collage circle ("Think Smarter, Learn Beyond"); a hero image set in Admin → Department takes its place.
const DEFAULT_HERO = "/hero-think-smarter.jpg";
// Second collage circle ("Tomorrow begins with us"), cropped to the photo's inner circle.
const SECOND_PHOTO = "/hero-students.jpg";
// Third collage circle ("Innovate Without Limits").
const THIRD_PHOTO = "/hero-innovate.jpg";

export default async function HomePage() {
  const [data, videos, mous] = await Promise.all([
    apiGet<HomeData>("/home"),
    apiGet<Page<Video>>("/videos", { page_size: 1 }),
    apiGet<Page<Mou>>("/mous", { page_size: 50 }),
  ]);
  const { department: dept, stats } = data;

  const ribbon = [
    { label: "Faculty", value: stats.faculty, icon: Users },
    { label: stats.students === 1 ? "Student" : "Students", value: stats.students, icon: GraduationCap },
    { label: stats.publications === 1 ? "Publication" : "Publications", value: stats.publications, icon: FileText },
    { label: stats.patents === 1 ? "Patent" : "Patents", value: stats.patents, icon: Award },
    { label: stats.achievements === 1 ? "Achievement" : "Achievements", value: stats.achievements, icon: Globe },
  ];

  return (
    <>
      <Hero dept={dept} hasVideos={videos.total > 0} />

      {/* Stats panel overlapping both Hero (dark) and About (white) - Pill Shaped & Sized up */}
      <div className="relative z-30 -mt-10 sm:-mt-12 lg:-mt-14">
        <Container>
          <div className="mx-auto max-w-6xl rounded-full border-2 border-sky-400 bg-[#020817] px-6 py-4.5 shadow-2xl shadow-sky-950/60 backdrop-blur-md transition-all duration-300 hover:border-sky-300 hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] sm:px-10 sm:py-5 lg:px-12 lg:py-6">
            <dl
              aria-label="Department at a glance"
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-10 lg:justify-between lg:gap-x-4"
            >
              {ribbon.map(({ label, value, icon: Icon }, idx) => (
                <div key={label} className="flex items-center gap-2.5 sm:gap-3">
                  <Icon className="size-5 shrink-0 text-sky-400 sm:size-6" strokeWidth={2} aria-hidden />
                  <span className="text-sm font-semibold tracking-wide text-sky-400 sm:text-base lg:text-lg">
                    <strong className="mr-1.5 text-base font-extrabold text-white sm:text-lg lg:text-xl">
                      {value.toLocaleString("en-IN")}
                    </strong>
                    {label}
                  </span>
                  {idx < ribbon.length - 1 && (
                    <span className="hidden h-5 w-px bg-sky-500/35 lg:inline-block lg:ml-5" aria-hidden />
                  )}
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </div>

      {dept && <AboutSection dept={dept} />}

      {/* Highlights (admin-curated) */}
      {data.highlights.length > 0 && (
        <section id="highlights" className="theme-dark scroll-mt-16 bg-band py-16">
          <Container>
            <h2 className="text-2xl font-extrabold sm:text-3xl">Department Highlights</h2>
            <div className="mt-2 h-1 w-12 rounded bg-gradient-to-r from-sky-400 to-cta" aria-hidden />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.highlights.map((h) => (
                <li key={h.id} className="overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10 transition-transform hover:-translate-y-0.5">
                  {isSafeUrl(h.image_url) && <SmartImage src={h.image_url} alt="" width={600} className="aspect-video w-full object-cover" />}
                  <div className="p-5">
                    <h3 className="font-heading text-lg font-bold">{h.title}</h3>
                    {h.description && <p className="mt-2 text-sm text-muted-foreground">{h.description}</p>}
                    {isSafeUrl(h.link_url) && (
                      <a href={h.link_url} className="mt-3 inline-block text-sm font-medium text-highlight hover:underline">
                        Learn more →
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <MousSection mous={mous.items} />
    </>
  );
}

/** Department name with the specialisation (text in brackets, else the last word) in cyan. */
function HeroTitle({ name }: { name: string }) {
  const i = name.indexOf("(");
  const split = i > 0 ? i : name.lastIndexOf(" ") + 1;
  return (
    <h1 className="mt-4 font-heading text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
      {name.slice(0, split)}
      <span className="bg-gradient-to-r from-sky-300 via-cyan-400 to-sky-500 bg-clip-text text-transparent">{name.slice(split)}</span>
    </h1>
  );
}

function Hero({ dept, hasVideos }: { dept: Department | null; hasVideos: boolean }) {
  const custom = isSafeUrl(dept?.hero_image_url) ? dept.hero_image_url : null;
  return (
    // -mt-16 / pt-16: the hero sits under the transparent sticky header.
    <section className="theme-dark relative isolate -mt-16 overflow-hidden bg-gradient-to-b from-[#0a1128] to-[#020817] pt-16 pb-16 sm:pb-20 lg:pb-24">
      {/* Layered glows behind the visuals. */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -left-32 top-24 size-[26rem] rounded-full bg-blue-700/25 mix-blend-screen blur-3xl" />
        <div className="absolute right-0 top-10 size-[34rem] rounded-full bg-sky-500/20 mix-blend-screen blur-3xl" />
        <div className="absolute bottom-0 right-1/3 size-80 rounded-full bg-cyan-400/10 mix-blend-screen blur-3xl" />
        {/* Fade the glows out so the bottom edge is exactly the navy background. */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-[#020817]" />
      </div>

      <Container className="grid items-center gap-12 pt-10 sm:pt-14 lg:grid-cols-2 lg:pt-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/80">
            Explore <span aria-hidden>•</span> Learn <span aria-hidden>•</span> Grow
          </p>
          <HeroTitle name={dept?.name ?? "Welcome to the Department"} />
          {dept?.tagline && <p className="mt-5 text-xl font-medium text-foreground/90">{dept.tagline}</p>}
          {dept?.intro && <p className="mt-4 max-w-xl leading-7 text-muted-foreground">{dept.intro}</p>}
          <div className="mt-8 flex items-center gap-3 sm:gap-4 flex-nowrap overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <Link
              href="#about"
              className="group inline-flex h-11 sm:h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-cta px-4 sm:px-5 text-sm sm:text-base font-semibold text-cta-foreground shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:bg-cta-hover hover:shadow-sky-400/40"
            >
              Explore Department <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/events"
              className="inline-flex h-11 sm:h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/30 px-4 sm:px-5 text-sm sm:text-base font-semibold transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-300"
            >
              <CalendarDays className="size-4" aria-hidden /> Upcoming Events
            </Link>
            {hasVideos && (
              <Link
                href="/gallery?tab=videos"
                className="group inline-flex shrink-0 items-center gap-2 sm:gap-2.5 text-sm font-medium whitespace-nowrap text-white hover:text-sky-300 transition-colors"
              >
                <span className="flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25 transition group-hover:bg-sky-400/20 group-hover:ring-sky-300">
                  <Play className="size-3.5 sm:size-4 translate-x-0.5 fill-current" aria-hidden />
                </span>
                <span>Watch Intro</span>
              </Link>
            )}
          </div>
        </div>

        {/* Visual collage: main photo, second photo and the motto take turns at the front. */}
        <HeroCollage mainSrc={custom} defaultSrc={DEFAULT_HERO} secondSrc={SECOND_PHOTO} thirdSrc={THIRD_PHOTO} />
      </Container>
    </section>
  );
}
