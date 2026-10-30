import Link from "next/link";
import { Images } from "lucide-react";
import { apiGet, pickParams } from "@/lib/api";
import type { GalleryAlbumListItem, Page, Video } from "@/lib/types";
import { formatDate, isSafeUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination } from "@/components/site/common";
import { SmartImage } from "@/components/site/smart-image";
import { VideoCard } from "@/components/site/video-card";

export async function generateMetadata() {
  return pageMetadata("Gallery", "Photos and videos of department events, workshops, symposiums, student activities and facilities.", "/gallery");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

// Album categories match the backend GALLERY_CATEGORIES vocabulary.
const TABS = [
  { label: "All Photos", category: "" },
  { label: "Events", category: "Events" },
  { label: "Workshops & Symposiums", category: "Workshops & Symposiums" },
  { label: "Student Activities", category: "Student Activities" },
  { label: "Laboratory & Infrastructure", category: "Laboratory & Infrastructure" },
];

export default async function GalleryPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["category", "tab", "page"]);
  const videos = values.tab === "videos";
  const category = TABS.find((t) => t.category === values.category)?.category ?? "";
  const params: Record<string, string> = videos ? { tab: "videos" } : category ? { category } : {};

  const [albums, clips] = await Promise.all([
    videos ? null : apiGet<Page<GalleryAlbumListItem>>("/gallery", { category: category || undefined, page: values.page, page_size: 12 }),
    videos ? apiGet<Page<Video>>("/videos", { page: values.page, page_size: 12 }) : null,
  ]);
  const data = albums ?? clips!;

  const tabCls = (active: boolean) =>
    cn("-mb-px block whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground");

  return (
    <>
      <PageHeader eyebrow="Gallery" title="Photos & Videos" description="Moments from department events, workshops, student activities and our facilities." />
      <Container className="py-10">
        <nav aria-label="Gallery categories" className="-mx-4 mb-8 overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1 border-b">
            {TABS.map((t) => {
              const active = !videos && category === t.category;
              return (
                <li key={t.label}>
                  <Link href={t.category ? `/gallery?category=${encodeURIComponent(t.category)}` : "/gallery"} aria-current={active ? "page" : undefined} className={tabCls(active)}>
                    {t.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/gallery?tab=videos" aria-current={videos ? "page" : undefined} className={tabCls(videos)}>
                Videos
              </Link>
            </li>
          </ul>
        </nav>

        {clips ? (
          clips.items.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {clips.items.map((v) => (
                <li key={v.id}>
                  <VideoCard v={v} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No videos published yet." />
          )
        ) : albums!.items.length ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums!.items.map((a) => (
              <li key={a.id}>
                <Link href={`/gallery/${a.slug}`} className="group block overflow-hidden rounded-lg border bg-card shadow-sm hover:shadow-md">
                  <div className="relative aspect-4/3 overflow-hidden bg-secondary">
                    {isSafeUrl(a.cover_image_url) ? (
                      <SmartImage src={a.cover_image_url} alt="" width={600} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <Images className="absolute inset-0 m-auto size-12 text-primary/30" aria-hidden />
                    )}
                    <span className="absolute bottom-2 right-2 rounded bg-black/65 px-2 py-0.5 text-xs text-white">{a.image_count} photos</span>
                  </div>
                  <div className="p-4">
                    <h2 className="font-heading text-lg font-semibold group-hover:text-primary group-hover:underline">{a.title}</h2>
                    <p className="text-sm text-muted-foreground">{[a.category, a.event_date && formatDate(a.event_date)].filter(Boolean).join(" · ")}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={category ? `No ${category.toLowerCase()} albums yet.` : "No albums published yet."} hint={category ? "Try another category." : undefined} />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/gallery" params={params} />
      </Container>
    </>
  );
}
