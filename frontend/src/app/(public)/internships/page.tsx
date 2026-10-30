import { Building2, CalendarClock, Clock, MapPin } from "lucide-react";
import { apiGet, pickParams } from "@/lib/api";
import type { Internship, Page } from "@/lib/types";
import { formatDate, humanize, isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, Pill, ResultCount } from "@/components/site/common";

export async function generateMetadata() {
  return pageMetadata("Internships", "Internship openings for students and internships completed by our students.", "/internships");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function InternshipsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "kind", "mode", "academic_year", "open", "page"]);
  const [data] = await Promise.all([
    apiGet<Page<Internship>>("/internships", { ...values, page_size: 12 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="Careers" title="Internships" description="Internship openings shared by the department and internships completed by our students." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="internship" />
        {data.items.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {data.items.map((i) => (
              <article key={i.id} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap gap-1.5">
                  <Pill tone={i.kind === "OPENING" ? "green" : "highlight"}>{i.kind === "OPENING" ? "Opening" : "Student internship"}</Pill>
                  {i.mode && <Pill>{humanize(i.mode)}</Pill>}
                </div>
                <h2 className="mt-3 font-heading text-xl font-semibold text-primary">{i.role}</h2>
                <p className="flex items-center gap-1.5 font-medium"><Building2 className="size-4" aria-hidden /> {i.company}</p>
                {i.kind === "STUDENT" && i.student_name && (
                  <p className="mt-1 text-sm">Intern: <span className="font-medium">{i.student_name}</span>{i.academic_year && ` · ${i.academic_year}`}</p>
                )}
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  {i.location && <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {i.location}</li>}
                  {i.duration && <li className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {i.duration}</li>}
                  {i.deadline && <li className="flex items-center gap-1.5"><CalendarClock className="size-4" aria-hidden /> Apply by {formatDate(i.deadline)}</li>}
                  {i.stipend && <li>Stipend: {i.stipend}</li>}
                </ul>
                {i.eligibility && <p className="mt-2 text-sm"><span className="font-medium">Eligibility:</span> {i.eligibility}</p>}
                {i.description && <p className="mt-2 text-sm text-muted-foreground">{i.description}</p>}
                {isSafeUrl(i.apply_url) && i.kind === "OPENING" && (
                  <a href={i.apply_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-9 items-center rounded-md bg-cta px-4 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">
                    Apply
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No internships found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/internships" params={filters} />
      </Container>
    </>
  );
}
