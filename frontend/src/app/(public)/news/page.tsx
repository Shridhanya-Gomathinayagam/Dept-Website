import { apiGet, pickParams } from "@/lib/api";
import type { NewsListItem, Page } from "@/lib/types";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, ResultCount } from "@/components/site/common";
import { NewsCard } from "@/components/site/cards";

export async function generateMetadata() {
  return pageMetadata("News", "Latest news and announcements from the department.", "/news");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function NewsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["q", "category", "year", "page"]);
  const [data] = await Promise.all([
    apiGet<Page<NewsListItem>>("/news", { ...values, page_size: 12 }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader eyebrow="Newsroom" title="Department News" description="Victories, publications, events and announcements from the department." />
      <Container className="py-10">
        <ResultCount total={data.total} noun="article" />
        {data.items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((n) => (
              <NewsCard key={n.id} n={n} />
            ))}
          </div>
        ) : (
          <EmptyState title="No news articles found." hint="Check back soon." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/news" params={filters} />
      </Container>
    </>
  );
}
