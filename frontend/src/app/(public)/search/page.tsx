import Link from "next/link";
import { Search } from "lucide-react";
import { apiGet, pickParams } from "@/lib/api";
import type { SearchResults } from "@/lib/types";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader } from "@/components/site/common";
import { facultyHref } from "@/lib/links";

export async function generateMetadata() {
  return { ...(await pageMetadata("Search", "Search faculty, students, achievements, events, research, projects, news and alumni.", "/search")), robots: { index: false } };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

// Where each result type lives on the public site.
const HREF: Record<string, (i: { id: number; slug: string | null }) => string> = {
  faculty: (i) => facultyHref(i.slug ?? String(i.id)),
  students: () => `/students`,
  "faculty-achievements": () => `/faculty-achievements`,
  "student-achievements": () => `/student-achievements`,
  events: (i) => `/events/${i.slug ?? i.id}`,
  publications: () => `/research?tab=publications`,
  "research-projects": () => `/research?tab=projects`,
  projects: () => `/projects`,
  news: (i) => `/news/${i.slug ?? i.id}`,
  alumni: () => `/alumni`,
};
const LIST: Record<string, string> = {
  faculty: "/faculty", students: "/students", "faculty-achievements": "/faculty-achievements",
  "student-achievements": "/student-achievements", events: "/events?when=all", publications: "/research?tab=publications",
  "research-projects": "/research?tab=projects", projects: "/projects", news: "/news", alumni: "/alumni",
};

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q = "" } = pickParams(await searchParams, ["q"]);
  const query = q.trim();
  const results = query.length >= 2 ? await apiGet<SearchResults>("/search", { q: query }) : null;

  return (
    <>
      <PageHeader title="Search" description="Find faculty, students, achievements, events, research, projects, news and alumni.">
        <form action="/search" method="get" role="search" className="mt-6 flex max-w-2xl gap-2">
          <label htmlFor="site-search" className="sr-only">Search the website</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="site-search" name="q" type="search" defaultValue={query} minLength={2} maxLength={100} required autoFocus placeholder="e.g. machine learning, hackathon, Dr. Kumar" className="h-12 w-full rounded-md border border-input bg-background pl-10 pr-3" />
          </div>
          <button type="submit" className="h-12 rounded-md bg-cta px-6 font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">Search</button>
        </form>
      </PageHeader>
      <Container className="py-10">
        {results === null ? (
          <p className="text-muted-foreground">Enter at least 2 characters to search.</p>
        ) : results.groups.length === 0 ? (
          <EmptyState title={`No results for “${query}”.`} hint="Try a different or shorter keyword." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {results.groups.map((g) => (
              <section key={g.key} className="rounded-lg border bg-card p-5 shadow-sm">
                <h2 className="flex items-baseline justify-between text-lg font-semibold text-primary">
                  {g.label} <span className="text-sm font-normal text-muted-foreground">{g.total} found</span>
                </h2>
                <ul className="mt-3 divide-y">
                  {g.items.map((i) => (
                    <li key={i.id} className="py-2.5">
                      <Link href={HREF[g.key]?.(i) ?? "/"} className="font-medium hover:text-primary hover:underline">{i.title}</Link>
                      {i.subtitle && <p className="text-sm text-muted-foreground">{i.subtitle}</p>}
                    </li>
                  ))}
                </ul>
                {g.total > g.items.length && (
                  <Link href={`${LIST[g.key]}${LIST[g.key].includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}`} className="mt-2 inline-block text-sm text-primary hover:underline">
                    See all {g.total} →
                  </Link>
                )}
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
