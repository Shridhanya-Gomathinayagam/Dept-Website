"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import type { Video } from "@/lib/types";
import { formatDate, isSafeUrl } from "@/lib/format";
import { SmartImage } from "./smart-image";

/** YouTube video id from watch, short, embed or shorts links; null for other sites. */
export function youTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/**
 * Shows a thumbnail first and loads the YouTube player only when played, so a page of videos
 * stays fast. Non-YouTube links open in a new tab.
 */
export function VideoCard({ v }: { v: Video }) {
  const [playing, setPlaying] = useState(false);
  const id = youTubeId(v.video_url);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="relative aspect-video bg-primary">
        {id && playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={v.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : id ? (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0" aria-label={`Play video: ${v.title}`}>
            <SmartImage src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" width={480} className="h-full w-full object-cover" />
            <span className="absolute inset-0 m-auto flex size-14 items-center justify-center rounded-full bg-black/70 text-white transition-transform group-hover:scale-110">
              <Play className="size-6 translate-x-0.5" aria-hidden />
            </span>
          </button>
        ) : (
          isSafeUrl(v.video_url) && (
            <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="group absolute inset-0 flex items-center justify-center text-primary-foreground">
              <span className="flex size-14 items-center justify-center rounded-full bg-black/40 transition-transform group-hover:scale-110">
                <Play className="size-6 translate-x-0.5" aria-hidden />
              </span>
              <span className="sr-only">Watch {v.title} (opens in a new tab)</span>
            </a>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h2 className="font-heading text-lg font-semibold leading-snug">{v.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{[v.category, v.event_date && formatDate(v.event_date)].filter(Boolean).join(" · ")}</p>
        {v.description && <p className="mt-2 line-clamp-3 text-sm">{v.description}</p>}
        {!id && isSafeUrl(v.video_url) && (
          <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-primary hover:underline">
            Watch video <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}
