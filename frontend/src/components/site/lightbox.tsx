"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { GalleryImage } from "@/lib/types";
import { imageUrl } from "@/lib/format";

export function Lightbox({ images, title }: { images: GalleryImage[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + images.length) % images.length)), [images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) {
      dialog.close();
      lastTrigger.current?.focus();
    }
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index !== null ? images[index] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={(e) => {
                lastTrigger.current = e.currentTarget;
                setIndex(i);
              }}
              className="group block w-full overflow-hidden rounded-md bg-secondary"
              aria-label={`Open photo ${i + 1} of ${images.length}${img.caption ? `: ${img.caption}` : ""}`}
            >
              <img
                src={imageUrl(img.image_url, 480)}
                alt={img.caption ?? `${title}: photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => e.target === dialogRef.current && close()}
        className="m-auto max-h-none max-w-none bg-transparent p-0 backdrop:bg-black/85"
        aria-label={`${title} photo viewer`}
      >
        {current && (
          <figure className="relative flex max-h-[92vh] w-[min(92vw,1200px)] flex-col items-center">
            <img src={imageUrl(current.image_url, 1600)} alt={current.caption ?? `${title}: photo ${index! + 1}`} className="max-h-[82vh] w-auto rounded object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white">
              {current.caption} <span className="text-white/60">({index! + 1} / {images.length})</span>
            </figcaption>
            <button type="button" onClick={close} className="absolute -top-2 right-0 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Close">
              <X className="size-5" />
            </button>
            {images.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Previous photo">
                  <ChevronLeft className="size-6" />
                </button>
                <button type="button" onClick={() => step(1)} className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/25" aria-label="Next photo">
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </figure>
        )}
      </dialog>
    </>
  );
}
