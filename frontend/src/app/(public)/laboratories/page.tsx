import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Laboratory, Page } from "@/lib/types";
import { isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pill, Tags, TextBlock } from "@/components/site/common";
import { SmartImage } from "@/components/site/smart-image";
import { facultyHref } from "@/lib/links";

export async function generateMetadata() {
  return pageMetadata("Laboratories", "Department laboratories, equipment, software and the courses they support.", "/laboratories");
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <Tags items={items} className="mt-2" />
    </div>
  );
}

export default async function LaboratoriesPage() {
  const labs = await apiGet<Page<Laboratory>>("/laboratories", { page_size: 50 });
  return (
    <>
      <PageHeader eyebrow="Infrastructure" title="Laboratories" description="Well-equipped laboratories supporting teaching, projects and research." />
      <Container className="py-10">
        {labs.items.length === 0 ? (
          <EmptyState title="Laboratory details have not been published yet." />
        ) : (
          <div className="space-y-8">
            {labs.items.map((l) => (
              <article id={l.slug} key={l.id} className="scroll-mt-24 overflow-hidden rounded-lg border bg-card shadow-sm md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                {isSafeUrl(l.image_url) ? (
                  <SmartImage src={l.image_url} alt={l.name} width={720} className="h-full max-h-80 w-full object-cover md:max-h-none" />
                ) : (
                  <div className="flex min-h-48 items-center justify-center bg-secondary" aria-hidden>
                    <FlaskConical className="size-14 text-primary/40" />
                  </div>
                )}
                <div className="space-y-4 p-6">
                  <div>
                    {l.is_research_lab && <Pill tone="highlight">Research Lab</Pill>}
                    <h2 className="mt-2 text-2xl font-semibold text-primary">{l.name}</h2>
                    {l.incharge_faculty && (
                      <p className="mt-1 text-sm">
                        In-charge:{" "}
                        <Link href={facultyHref(l.incharge_faculty.slug)} className="font-medium text-primary hover:underline">
                          {l.incharge_faculty.name}
                        </Link>
                      </p>
                    )}
                  </div>
                  <TextBlock text={l.description} className="text-foreground/85" />
                  <ListBlock title="Equipment" items={l.equipment} />
                  <ListBlock title="Software & Tools" items={l.software} />
                  <ListBlock title="Courses Supported" items={l.courses} />
                  <ListBlock title="Research Domains" items={l.research_domains} />
                  {l.student_projects && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student Projects</h3>
                      <TextBlock text={l.student_projects} className="mt-1 text-sm" />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
