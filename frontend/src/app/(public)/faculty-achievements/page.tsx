import { apiGet, pickParams } from "@/lib/api";
import type { FacultyAchievement, Page } from "@/lib/types";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, ResultCount } from "@/components/site/common";
import { FacultyAchievementCard } from "@/components/site/cards";

export async function generateMetadata() {
  return pageMetadata("Faculty Achievements", "Awards, publications, patents, invited talks and funded projects of our faculty.", "/faculty-achievements");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function FacultyAchievementsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "year", "faculty_id", "category", "domain", "page"]);
  const [data] = await Promise.all([
    apiGet<Page<FacultyAchievement>>("/faculty-achievements", { ...values, page_size: 12 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="Achievements" title="Faculty Achievements" description="Recognition, research and contributions of our faculty members." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="achievement" />
        {data.items.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.items.map((a) => (
              <FacultyAchievementCard key={a.id} a={a} />
            ))}
          </div>
        ) : (
          <EmptyState title="No achievements found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/faculty-achievements" params={filters} />
      </Container>
    </>
  );
}
