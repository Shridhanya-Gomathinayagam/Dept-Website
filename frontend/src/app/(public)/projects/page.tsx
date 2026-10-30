import Link from "next/link";
import { apiGet, pickParams } from "@/lib/api";
import type { Page, Project } from "@/lib/types";
import { isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, ExternalLink, PageHeader, Pagination, Pill, ResultCount, Tags } from "@/components/site/common";
import { SmartImage } from "@/components/site/smart-image";
import { facultyHref } from "@/lib/links";

export async function generateMetadata() {
  return pageMetadata("Project Showcase", "Student and faculty-guided projects: domains, technologies and demos.", "/projects");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ProjectsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "academic_year", "domain", "technology", "page"]);
  const [data] = await Promise.all([
    apiGet<Page<Project>>("/projects", { ...values, page_size: 12 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="Innovation" title="Project Showcase" description="Projects built by our students under faculty guidance." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="project" />
        {data.items.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
                {isSafeUrl(p.image_urls[0]) ? (
                  <SmartImage src={p.image_urls[0]} alt={`Screenshot of ${p.title}`} width={640} className="aspect-[16/9] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-secondary to-muted" aria-hidden />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill>{p.academic_year}</Pill>
                    {p.domain && <Pill tone="blue">{p.domain}</Pill>}
                    {p.is_featured && <Pill tone="highlight">Featured</Pill>}
                  </div>
                  <h2 className="mt-3 font-heading text-lg font-semibold leading-snug text-primary">{p.title}</h2>
                  <p className="mt-1 text-sm"><span className="font-medium">Team:</span> {p.students}</p>
                  {p.guide_faculty && (
                    <p className="text-sm">
                      <span className="font-medium">Guide:</span>{" "}
                      <Link href={facultyHref(p.guide_faculty.slug)} className="text-primary hover:underline">{p.guide_faculty.name}</Link>
                    </p>
                  )}
                  {p.description && <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">{p.description}</p>}
                  <Tags items={p.technologies} className="mt-3" />
                  {p.publication && <p className="mt-2 text-sm"><span className="font-medium">Publication:</span> {p.publication}</p>}
                  <div className="mt-auto flex gap-4 pt-4 text-sm">
                    <ExternalLink href={p.github_url}>GitHub</ExternalLink>
                    <ExternalLink href={p.demo_url}>Live demo</ExternalLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No projects found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/projects" params={filters} />
      </Container>
    </>
  );
}
