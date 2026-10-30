import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api";
import type { EventItem, GalleryAlbumListItem, NewsListItem, Page } from "@/lib/types";

export const revalidate = 3600;

const STATIC = [
  "", "/faculty", "/students", "/faculty-achievements", "/student-achievements", "/events", "/opportunities",
  "/placements", "/internships", "/research", "/laboratories", "/projects", "/alumni", "/news", "/gallery", "/academics", "/contact",
];

async function all<T>(path: string): Promise<T[]> {
  try {
    return (await apiGet<Page<T>>(path, { page_size: 100 })).items;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const [news, events, albums] = await Promise.all([
    all<NewsListItem>("/news"),
    all<EventItem>("/events"),
    all<GalleryAlbumListItem>("/gallery"),
  ]);
  return [
    ...STATIC.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...news.map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: n.published_on, priority: 0.5 })),
    ...events.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: e.updated_at, priority: 0.5 })),
    ...albums.map((a) => ({ url: `${base}/gallery/${a.slug}`, priority: 0.3 })),
  ];
}
