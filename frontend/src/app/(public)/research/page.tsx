import Link from "next/link";
import { apiGet, pickParams } from "@/lib/api";
import type { Page, Patent, Publication, ResearchProject, ResearchSummary } from "@/lib/types";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, ExternalLink, PageHeader, Pagination, Pill, ResultCount, Tags } from "@/components/site/common";
import { facultyHref } from "@/lib/links";

export async function generateMetadata() {
  return pageMetadata("Research & Innovation", "Publications, patents, funded projects, research labs and industry collaborations.", "/research");
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const TABS = [
  { key: "publications", label: "Publications" },
  { key: "patents", label: "Patents" },
  { key: "projects", label: "Funded Projects" },
] as const;

export default async function ResearchPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "publications") as (typeof TABS)[number]["key"];
  const values = pickParams(sp, ["q", "year", "faculty_id", "domain", "pub_type", "student", "patent_status", "project_status", "industry", "page"]);
  const endpoint = tab === "publications" ? "/publications" : tab === "patents" ? "/patents" : "/research-projects";
  const [summary, list] = await Promise.all([
    apiGet<ResearchSummary>("/research-summary"),
    apiGet<Page<Publication | Patent | ResearchProject>>(endpoint, { ...values, page_size: 20 }),
  ]);
  const { page, ...filters } = values;
  const ongoing = summary.projects_by_status.ONGOING ?? 0;
  const completed = summary.projects_by_status.COMPLETED ?? 0;

  return (
    <>
      <PageHeader eyebrow="Research & Innovation" title="Research Repository" description="Publications, patents, funded and collaborative projects by our faculty and students." />
      <Container className="space-y-10 py-10">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: "Publications", value: summary.publications },
            { label: "Student Publications", value: summary.student_publications },
            { label: "Patents", value: summary.patents },
            { label: "Ongoing / Completed Projects", value: `${ongoing} / ${completed}` },
            { label: "Industry Collaborations", value: summary.industry_collaborations },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-card p-5 shadow-sm">
              <dt className="text-sm text-muted-foreground">{s.label}</dt>
              <dd className="mt-1 font-heading text-2xl font-semibold text-primary">{s.value}</dd>
            </div>
          ))}
        </dl>

        {summary.domains.length > 0 && (
          <section id="areas" className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-primary">Research Areas</h2>
            <Tags items={summary.domains} className="mt-3" />
          </section>
        )}

        {summary.research_labs.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-primary">Research Labs</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.research_labs.map((l) => (
                <li key={l.id} className="rounded-lg border bg-card p-4">
                  <Link href={`/laboratories#${l.slug}`} className="font-medium text-primary hover:underline">{l.name}</Link>
                  {l.research_domains.length > 0 && <p className="mt-1 text-sm text-muted-foreground">{l.research_domains.join(", ")}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="repository" className="scroll-mt-24">
          <nav aria-label="Research categories" className="mb-6 flex flex-wrap gap-2 border-b">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/research?tab=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={cn("-mb-px border-b-2 px-4 py-2 text-sm font-medium", tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <ResultCount total={list.total} noun={tab === "projects" ? "project" : tab === "patents" ? "patent" : "publication"} />
          {list.items.length === 0 ? (
            <EmptyState title="No records found." hint="Check back soon." />
          ) : (
            <ol className="space-y-4">
              {tab === "publications" &&
                (list.items as Publication[]).map((p) => (
                  <li key={p.id} className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone="blue">{humanize(p.pub_type)}</Pill>
                      <Pill>{p.year}</Pill>
                      {p.indexing && <Pill tone="highlight">{p.indexing}</Pill>}
                      {p.is_student_publication && <Pill tone="green">Student</Pill>}
                    </div>
                    <h3 className="mt-2 font-heading text-lg font-semibold leading-snug">{p.url ? <ExternalLink href={p.url}>{p.title}</ExternalLink> : p.title}</h3>
                    <p className="mt-1 text-sm">{p.authors}</p>
                    <p className="text-sm text-muted-foreground">
                      {[p.venue, p.domain, p.doi ? `DOI: ${p.doi}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              {tab === "patents" &&
                (list.items as Patent[]).map((p) => (
                  <li key={p.id} className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone={p.patent_status === "GRANTED" ? "green" : "blue"}>{humanize(p.patent_status)}</Pill>
                      <Pill>{p.year}</Pill>
                    </div>
                    <h3 className="mt-2 font-heading text-lg font-semibold">{p.url ? <ExternalLink href={p.url}>{p.title}</ExternalLink> : p.title}</h3>
                    <p className="mt-1 text-sm">{p.inventors}</p>
                    <p className="text-sm text-muted-foreground">
                      {[p.application_no && `Application ${p.application_no}`, p.patent_no && `Patent ${p.patent_no}`, p.domain].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              {tab === "projects" &&
                (list.items as ResearchProject[]).map((p) => (
                  <li key={p.id} className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone={p.project_status === "ONGOING" ? "green" : "default"}>{humanize(p.project_status)}</Pill>
                      <Pill>{p.year}</Pill>
                      {p.is_industry_collaboration && <Pill tone="highlight">Industry collaboration</Pill>}
                    </div>
                    <h3 className="mt-2 font-heading text-lg font-semibold">{p.title}</h3>
                    <p className="mt-1 text-sm">
                      {p.pi_faculty && (
                        <>PI: <Link href={facultyHref(p.pi_faculty.slug)} className="text-primary hover:underline">{p.pi_faculty.name}</Link></>
                      )}
                      {p.investigators && ` · ${p.investigators}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[p.funding_agency, p.amount_lakhs != null && `₹${p.amount_lakhs} lakhs`, p.collaboration_partner, p.domain].filter(Boolean).join(" · ")}
                    </p>
                    {p.description && <p className="mt-2 text-sm">{p.description}</p>}
                  </li>
                ))}
            </ol>
          )}
          <Pagination page={list.page} pages={list.pages} basePath="/research" params={{ ...filters, tab }} />
        </section>
      </Container>
    </>
  );
}
