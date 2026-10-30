"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, ClientApiError } from "@/lib/client-api";
import { imageUrl } from "@/lib/format";
import type { GalleryAlbum, GalleryImage } from "@/lib/types";
import { useAdmin } from "./admin-context";
import { inputCls } from "./fields";

export function GalleryImagesManager({ albumId }: { albumId: number }) {
  const { confirm } = useAdmin();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const album = await api<GalleryAlbum>(`/admin/gallery/${albumId}`);
    setImages(album.images);
  }, [albumId]);

  useEffect(() => {
    load().catch(() => toast.error("Could not load photos"));
  }, [load]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading({ done: 0, total: list.length });
    const urls: string[] = [];
    for (const file of list) {
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "image");
        form.append("folder", "gallery");
        urls.push((await api<{ url: string }>("/admin/uploads", { form })).url);
      } catch (e) {
        toast.error(`${file.name}: ${e instanceof ClientApiError ? e.message : "upload failed"}`);
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
    }
    if (urls.length) {
      await api(`/admin/gallery/${albumId}/images`, { body: { images: urls.map((image_url) => ({ image_url })) } });
      toast.success(`${urls.length} photo(s) added`);
      await load();
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveCaption(img: GalleryImage, caption: string) {
    if ((img.caption ?? "") === caption) return;
    try {
      await api(`/admin/gallery/images/${img.id}`, { method: "PUT", body: { image_url: img.image_url, caption: caption || null, display_order: img.display_order } });
      toast.success("Caption saved");
      await load();
    } catch (e) {
      toast.error(e instanceof ClientApiError ? e.message : "Could not save caption");
    }
  }

  async function remove(img: GalleryImage) {
    if (!(await confirm({ title: "Remove this photo from the album?", confirmLabel: "Remove", destructive: true }))) return;
    await api(`/admin/gallery/images/${img.id}`, { method: "DELETE" });
    toast.success("Photo removed");
    await load();
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="photos-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="photos-heading" className="text-lg font-semibold">Photos ({images.length})</h2>
          <p className="text-sm text-muted-foreground">Upload several images at once. Captions are optional and are saved when you leave the field.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={!!uploading} className="inline-flex h-10 items-center gap-1.5 rounded-md bg-cta px-4 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground disabled:opacity-60">
          {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
          {uploading ? `Uploading ${uploading.done}/${uploading.total}` : "Add photos"}
        </button>
        <input ref={inputRef} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => onFiles(e.target.files)} />
      </div>
      {images.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="space-y-2">
              <div className="relative">
                <img src={imageUrl(img.image_url, 320)} alt={img.caption ?? `Photo ${i + 1}`} className="aspect-square w-full rounded-md border object-cover" loading="lazy" />
                <button type="button" onClick={() => remove(img)} className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 text-destructive shadow hover:bg-background" aria-label={`Remove photo ${i + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
              <label className="sr-only" htmlFor={`caption-${img.id}`}>Caption for photo {i + 1}</label>
              <input id={`caption-${img.id}`} defaultValue={img.caption ?? ""} maxLength={300} placeholder="Caption" onBlur={(e) => saveCaption(img, e.target.value.trim())} className={`${inputCls} h-9`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
