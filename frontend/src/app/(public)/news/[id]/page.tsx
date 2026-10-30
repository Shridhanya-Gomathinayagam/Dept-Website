import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiGetOrNull } from "@/lib/api";
import type { News } from "@/lib/types";
import { formatDate, isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, ExternalLink, Markdown } from "@/components/site/common";
import { SmartImage } from "@/components/site/smart-image";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const n = await apiGetOrNull<News>(`/news/${encodeURIComponent(id)}`);
  if (!n) notFound();
  const meta = await pageMetadata(n.title, n.summary, `/news/${n.slug}`);
  return {
    ...meta,
    openGraph: { ...meta.openGraph, type: "article", publishedTime: n.published_on, images: n.cover_image_url ? [n.cover_image_url] : [] },
  };
}

export default async function NewsArticle({ params }: { params: Params }) {
  const { id } = await params;
  const n = await apiGetOrNull<News>(`/news/${encodeURIComponent(id)}`);
  if (!n) notFound();

  return (
    <Container className="max-w-3xl py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/news" className="hover:underline">News</Link> <span aria-hidden>/</span> <span>{n.category}</span>
      </nav>
      <article>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
          {n.category} · <time dateTime={n.published_on}>{formatDate(n.published_on)}</time>
          {n.author && <span className="normal-case tracking-normal text-muted-foreground"> · By {n.author}</span>}
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-primary sm:text-4xl">{n.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{n.summary}</p>
        {isSafeUrl(n.cover_image_url) && (
          <SmartImage src={n.cover_image_url} alt="" width={1200} priority className="mt-8 w-full rounded-lg border object-cover" />
        )}
        {n.content && (
          <div className="mt-8 text-[1.05rem]">
            <Markdown>{n.content}</Markdown>
          </div>
        )}
        {n.image_urls.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-primary">Photos</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {n.image_urls.filter(isSafeUrl).map((url, i) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <SmartImage src={url} alt={`${n.title}: photo ${i + 1}`} width={400} className="aspect-square w-full rounded-md object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {n.external_url && (
          <p className="mt-8">
            <ExternalLink href={n.external_url}>Read more on the source website →</ExternalLink>
          </p>
        )}
      </article>
    </Container>
  );
}
