import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiGetOrNull } from "@/lib/api";
import type { GalleryAlbum } from "@/lib/types";
import { formatDate, isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, TextBlock } from "@/components/site/common";
import { Lightbox } from "@/components/site/lightbox";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const a = await apiGetOrNull<GalleryAlbum>(`/gallery/${encodeURIComponent(id)}`);
  if (!a) notFound();
  const meta = await pageMetadata(a.title, a.description?.slice(0, 160) ?? `Photo album: ${a.title}`, `/gallery/${a.slug}`);
  const cover = a.cover_image_url ?? a.images[0]?.image_url;
  return { ...meta, openGraph: { ...meta.openGraph, images: cover ? [cover] : [] } };
}

export default async function AlbumPage({ params }: { params: Params }) {
  const { id } = await params;
  const album = await apiGetOrNull<GalleryAlbum>(`/gallery/${encodeURIComponent(id)}`);
  if (!album) notFound();
  const images = album.images.filter((i) => isSafeUrl(i.image_url));

  return (
    <Container className="py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/gallery" className="hover:underline">Gallery</Link> <span aria-hidden>/</span> <span>{album.title}</span>
      </nav>
      <h1 className="text-3xl font-semibold text-primary sm:text-4xl">{album.title}</h1>
      {album.event_date && <p className="mt-1 text-muted-foreground">{formatDate(album.event_date)}</p>}
      <TextBlock text={album.description} className="mt-4 max-w-3xl" />
      <div className="mt-8">
        {images.length ? <Lightbox images={images} title={album.title} /> : <EmptyState title="This album has no photos yet." />}
      </div>
    </Container>
  );
}
