import { apiGet, pickParams } from "@/lib/api";
import type { Page, StudentPublic } from "@/lib/types";
import { pageMetadata } from "@/lib/site";
import { Avatar, Container, EmptyState, ExternalLink, PageHeader, Pagination, ResultCount, Tags } from "@/components/site/common";

export async function generateMetadata() {
  return pageMetadata("Students", "Student directory: batches, skills and areas of interest.", "/students");
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const KEYS = ["q", "batch", "academic_year", "section", "skill", "interest", "page"];

export default async function StudentsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, KEYS);
  const [data] = await Promise.all([
    apiGet<Page<StudentPublic>>("/students", { ...values, page_size: 24 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="People" title="Student Directory" description="Our students, their skills and the areas they are passionate about." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="student" />
        {data.items.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((s) => (
              <li key={s.id} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar src={s.photo_url} name={s.name} size={56} className="size-14 shrink-0 text-lg" />
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-lg font-semibold">{s.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Batch {s.batch}
                      {s.academic_year && ` · Year ${s.academic_year}`}
                      {s.section && ` · Sec ${s.section}`}
                    </p>
                    {s.register_no && <p className="text-xs text-muted-foreground">{s.register_no}</p>}
                  </div>
                </div>
                {s.skills.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills</p>
                    <Tags items={s.skills} />
                  </div>
                )}
                {s.interests.length > 0 && (
                  <p className="mt-3 text-sm"><span className="font-medium">Interests:</span> {s.interests.join(", ")}</p>
                )}
                {s.achievements_summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.achievements_summary}</p>}
                {s.projects_summary && <p className="mt-2 line-clamp-2 text-sm"><span className="font-medium">Projects:</span> {s.projects_summary}</p>}
                {(s.linkedin_url || s.github_url || s.email) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <ExternalLink href={s.linkedin_url}>LinkedIn</ExternalLink>
                    <ExternalLink href={s.github_url}>GitHub</ExternalLink>
                    {s.email && <a href={`mailto:${s.email}`} className="text-primary hover:underline">Email</a>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No students found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/students" params={filters} />
      </Container>
    </>
  );
}
