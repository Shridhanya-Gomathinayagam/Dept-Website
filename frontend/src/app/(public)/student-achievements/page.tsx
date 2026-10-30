import Link from "next/link";
import { X } from "lucide-react";
import { apiGet, pickParams } from "@/lib/api";
import type { Page, StudentAchievement } from "@/lib/types";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, ResultCount } from "@/components/site/common";
import { StudentAchievementCard } from "@/components/site/cards";

export async function generateMetadata() {
  return pageMetadata("Student Achievements", "Hackathon wins, paper presentations, competitions, sports and more by our students.", "/student-achievements");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

// Keys match the backend achievement "group" filter.
const GROUPS: Record<string, string> = { competitions: "Hackathons & Competitions" };

export default async function StudentAchievementsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "year", "category", "level", "batch", "student", "group", "page"]);
  const groupLabel = values.group ? GROUPS[values.group] : undefined;
  if (!groupLabel) delete values.group;
  const [data] = await Promise.all([
    apiGet<Page<StudentAchievement>>("/student-achievements", { ...values, page_size: 12 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="Achievement Wall" title="Student Achievements" description="Celebrating the wins of our students: in hackathons, research, competitions, sports and culture." />
      <Container className="py-10">
        {groupLabel && (
          <p className="mb-4 flex items-center gap-2 text-sm">
            Showing
            <Link href="/student-achievements" className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground hover:opacity-90">
              {groupLabel} <X className="size-3.5" aria-hidden /> <span className="sr-only">(show all achievements)</span>
            </Link>
          </p>
        )}
        <ResultCount total={data.total} noun="achievement" />
        {data.items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((a) => (
              <StudentAchievementCard key={a.id} a={a} />
            ))}
          </div>
        ) : (
          <EmptyState title="No achievements found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/student-achievements" params={filters} />
      </Container>
    </>
  );
}
