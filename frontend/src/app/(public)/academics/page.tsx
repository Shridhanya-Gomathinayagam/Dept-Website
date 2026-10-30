import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Download, ExternalLink, FileText, FlaskConical, GraduationCap, Users } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { AcademicDocument, Laboratory, Page, Program } from "@/lib/types";
import { isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pill } from "@/components/site/common";

export async function generateMetadata() {
  return pageMetadata("Academics", "Programmes offered, curriculum and syllabus, regulations, academic calendar, timetables and laboratories.", "/academics");
}

// Document sections in page order; categories match the backend ACADEMIC_DOCUMENT_CATEGORIES vocabulary.
const DOC_SECTIONS = [
  { id: "curriculum", title: "Curriculum & Syllabus", category: "Curriculum & Syllabus" },
  { id: "regulations", title: "Academic Regulations", category: "Academic Regulations" },
  { id: "calendar", title: "Academic Calendar", category: "Academic Calendar" },
  { id: "timetable", title: "Timetable", category: "Timetable" },
  { id: "documents", title: "Downloadable Documents", category: "Other Documents" },
];

const LEVEL_LABEL: Record<Program["level"], string> = { UG: "Undergraduate", PG: "Postgraduate", PhD: "Doctoral" };

export default async function AcademicsPage() {
  const [programs, docs, labs] = await Promise.all([
    apiGet<Page<Program>>("/programs", { page_size: 50 }),
    apiGet<Page<AcademicDocument>>("/academic-documents", { page_size: 100 }),
    apiGet<Page<Laboratory>>("/laboratories", { page_size: 50 }),
  ]);
  const byCategory = (c: string) => docs.items.filter((d) => d.category === c);
  const filled = DOC_SECTIONS.filter((s) => byCategory(s.category).length > 0);
  const empty = DOC_SECTIONS.filter((s) => byCategory(s.category).length === 0);
  const jump = [
    { id: "programs", label: "Programs" },
    ...filled.map((s) => ({ id: s.id, label: s.title })),
    { id: "laboratories", label: "Laboratories" },
  ];

  return (
    <>
      <PageHeader eyebrow="Academics" title="Academics" description="Programmes, curriculum, regulations, calendars and timetables, all in one place." />
      <nav aria-label="On this page" className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur">
        <Container>
          <ul className="-mx-1 flex gap-1 overflow-x-auto py-2">
            {jump.map((j) => (
              <li key={j.id}>
                <a href={`#${j.id}`} className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  {j.label}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </nav>

      <Container className="space-y-14 py-10">
        <section id="programs" aria-labelledby="programs-heading" className="scroll-mt-32">
          <h2 id="programs-heading" className="text-2xl font-semibold text-primary">Programs Offered</h2>
          {programs.items.length ? (
            <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {programs.items.map((p) => (
                <li key={p.id} className="flex flex-col rounded-lg border bg-card p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <GraduationCap className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <Pill tone="blue">{LEVEL_LABEL[p.level] ?? p.level}</Pill>
                      <h3 className="mt-1 font-heading text-lg font-semibold leading-snug">{p.name}</h3>
                    </div>
                  </div>
                  {(p.duration || p.intake != null) && (
                    <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      {p.duration && (
                        <div className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /><dt className="sr-only">Duration</dt><dd>{p.duration}</dd></div>
                      )}
                      {p.intake != null && (
                        <div className="flex items-center gap-1.5"><Users className="size-4" aria-hidden /><dt className="sr-only">Intake</dt><dd>{p.intake} seats</dd></div>
                      )}
                    </dl>
                  )}
                  {p.description && <p className="mt-3 text-sm leading-6">{p.description}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6"><EmptyState title="Programme details will be published soon." /></div>
          )}
        </section>

        {filled.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-heading`} className="scroll-mt-32">
            <h2 id={`${s.id}-heading`} className="text-2xl font-semibold text-primary">{s.title}</h2>
            <ul className="mt-6 divide-y overflow-hidden rounded-lg border bg-card shadow-sm">
              {byCategory(s.category).map((d) => <DocumentRow key={d.id} d={d} />)}
            </ul>
          </section>
        ))}

        {empty.length > 0 && (
          // Empty categories share one line; each keeps its anchor so menu links still land here.
          <p className="rounded-lg border border-dashed px-5 py-4 text-sm text-muted-foreground">
            Not yet published:{" "}
            {empty.map((s, i) => (
              <span key={s.id} id={s.id} className="scroll-mt-32">
                <span className="font-medium text-foreground">{s.title}</span>
                {i < empty.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        )}

        <section id="laboratories" aria-labelledby="labs-heading" className="scroll-mt-32">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="labs-heading" className="text-2xl font-semibold text-primary">Laboratory Details</h2>
            <Link href="/laboratories" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Equipment, software & courses <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {labs.items.length ? (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {labs.items.map((l) => (
                <li key={l.id}>
                  <Link href={`/laboratories#${l.slug}`} className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm hover:shadow-md">
                    <FlaskConical className="size-5 shrink-0 text-primary" aria-hidden />
                    <span className="font-medium">{l.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nothing published here yet.</p>
          )}
        </section>
      </Container>
    </>
  );
}

function DocumentRow({ d }: { d: AcademicDocument }) {
  const meta = [d.program, d.regulation && `Regulation ${d.regulation}`, d.academic_year].filter(Boolean).join(" · ");
  const Icon = d.category === "Academic Calendar" ? CalendarDays : FileText;
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Icon className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{d.title}</p>
        {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
        {d.description && <p className="mt-1 text-sm">{d.description}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {isSafeUrl(d.file_url) && (
          <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-cta px-3 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">
            <Download className="size-4" aria-hidden /> Download <span className="sr-only">{d.title}</span>
          </a>
        )}
        {isSafeUrl(d.external_url) && (
          <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted">
            Open <ExternalLink className="size-3.5" aria-hidden /> <span className="sr-only">{d.title} (opens in a new tab)</span>
          </a>
        )}
      </div>
    </li>
  );
}
