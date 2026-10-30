import { Quote } from "lucide-react";
import { apiGet, pickParams } from "@/lib/api";
import type { Alumnus, Page } from "@/lib/types";
import { pageMetadata } from "@/lib/site";
import { Avatar, Container, EmptyState, ExternalLink, PageHeader, Pagination, ResultCount } from "@/components/site/common";

export async function generateMetadata() {
  return pageMetadata("Alumni", "Our alumni network: where our graduates work and study today.", "/alumni");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AlumniPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "graduation_year", "page"]);
  const [data] = await Promise.all([
    apiGet<Page<Alumnus>>("/alumni", { ...values, page_size: 24 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="Community" title="Alumni" description="Our graduates are building careers at leading organizations and institutions around the world." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="alumnus" />
        {data.items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((a) => (
              <article key={a.id} className="flex flex-col rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar src={a.photo_url} name={a.name} size={64} className="size-16 shrink-0 text-lg" />
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg font-semibold">{a.name}</h2>
                    <p className="text-sm text-muted-foreground">Class of {a.graduation_year}{a.batch && ` · ${a.batch}`}</p>
                  </div>
                </div>
                {(a.designation || a.organization) && (
                  <p className="mt-3 text-sm font-medium">{[a.designation, a.organization].filter(Boolean).join(", ")}</p>
                )}
                {a.higher_studies && <p className="mt-1 text-sm">Higher studies: {a.higher_studies}</p>}
                {a.achievements && <p className="mt-2 text-sm text-muted-foreground">{a.achievements}</p>}
                {a.testimonial && (
                  <blockquote className="relative mt-4 rounded-md bg-accent/50 p-4 pl-10 text-sm italic">
                    <Quote className="absolute left-3 top-3 size-4 text-primary" aria-hidden />
                    {a.testimonial}
                  </blockquote>
                )}
                {a.events_participated && <p className="mt-3 text-xs text-muted-foreground">Alumni events: {a.events_participated}</p>}
                <div className="mt-auto pt-3 text-sm">
                  <ExternalLink href={a.linkedin_url}>LinkedIn</ExternalLink>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No alumni found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/alumni" params={filters} />
      </Container>
    </>
  );
}
