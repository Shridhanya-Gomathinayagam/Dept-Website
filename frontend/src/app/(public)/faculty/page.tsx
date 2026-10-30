import type { Metadata } from "next";
import { apiGet, apiGetOrNull, pickParams } from "@/lib/api";
import type { Faculty, FacultyListItem, Page } from "@/lib/types";
import { facultyHref } from "@/lib/links";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, ResultCount } from "@/components/site/common";
import { FacultyDirectory } from "@/components/site/faculty-directory";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  // A shared profile link (?profile=slug) gets that faculty member's title and description.
  const { profile } = pickParams(await searchParams, ["profile"]);
  const f = profile ? await apiGetOrNull<Faculty>(`/faculty/${encodeURIComponent(profile)}`) : null;
  if (f) {
    const meta = await pageMetadata(f.name, `${f.name}, ${f.designation}${f.specialization ? `: ${f.specialization}` : ""}`, facultyHref(f.slug));
    return { ...meta, openGraph: { ...meta.openGraph, type: "profile", images: f.photo_url ? [f.photo_url] : [] } };
  }
  return pageMetadata("Faculty", "Meet our faculty members, their qualifications and areas of expertise.", "/faculty");
}

export default async function FacultyPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "designation", "page"]);
  const [data] = await Promise.all([
    apiGet<Page<FacultyListItem>>("/faculty", { ...values, page_size: 24 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="People" title="Our Faculty" description="Experienced educators and researchers guiding the next generation of engineers. Select a faculty member to view their profile." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="faculty member" />
        {data.items.length ? (
          <FacultyDirectory items={data.items} />
        ) : (
          <EmptyState title="No faculty members found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/faculty" params={filters} />
      </Container>
    </>
  );
}
