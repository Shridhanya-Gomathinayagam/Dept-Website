"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import type { FacultyListItem } from "@/lib/types";
import { initials, isSafeUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SmartImage } from "./smart-image";
import { FacultyProfileDialog } from "./faculty-profile-dialog";

/**
 * Header band card:
 * - Dark navy header band with cyan bottom accent line
 * - Circular avatar with white ring overlaps the header and body
 * - On hover: navy band grows taller, card lifts, and border turns cyan
 */
function FacultyCard({ f, onOpen }: { f: FacultyListItem; onOpen: (slug: string) => void }) {
  const hasPhoto = isSafeUrl(f.photo_url);

  // Extract primary expertise for concise pill display
  const primaryExpertise = f.specialization
    ? f.specialization.split(",")[0].trim()
    : f.research_interests?.[0] || null;

  return (
    <div
      onClick={() => onOpen(f.slug)}
      className={cn(
        "group relative flex h-[350px] w-full max-w-[290px] flex-col overflow-hidden rounded-2xl sm:rounded-3xl",
        "bg-white border-2 border-slate-200/80 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-2 hover:border-[#00a8e8] hover:shadow-xl hover:shadow-sky-500/15",
        "cursor-pointer select-none"
      )}
      title="Click to view full profile"
    >
      {/* Top: Navy header band with bottom cyan accent line */}
      <div className="relative w-full bg-[#020817] border-b-2 border-[#00a8e8] transition-all duration-300 ease-out h-24 sm:h-26 group-hover:h-30 sm:group-hover:h-32">
        {/* Subtle radial glow inside navy band */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/30 via-transparent to-transparent"
          aria-hidden="true"
        />
      </div>

      {/* Circular Avatar: Overlapping the navy band and white body */}
      <div className="relative -mt-12 sm:-mt-14 flex justify-center">
        <div className="relative size-24 sm:size-28 shrink-0 overflow-hidden rounded-full bg-[#e0f2fe] ring-4 ring-white shadow-md transition-transform duration-300 ease-out group-hover:scale-105 flex items-center justify-center">
          {hasPhoto ? (
            <SmartImage
              src={f.photo_url}
              alt={f.name}
              width={256}
              className="size-full object-cover object-top"
            />
          ) : (
            <span className="text-2xl sm:text-3xl font-extrabold text-[#0369a1] tracking-wider select-none">
              {initials(f.name)}
            </span>
          )}
        </div>
      </div>

      {/* Card Body: Name, Designation & Pills */}
      <div className="flex flex-1 flex-col items-center justify-between p-5 pt-3 text-center">
        {/* Name & Designation */}
        <div className="w-full px-1">
          <h2 className="font-heading text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-snug transition-colors duration-200 group-hover:text-slate-950">
            {f.name}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#0284c7] leading-snug">
            {f.designation}
          </p>
        </div>

        {/* Bottom: Qualification & Specialization Pills */}
        <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-2">
          {f.qualification && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 shadow-xs">
              {f.qualification}
            </span>
          )}
          {primaryExpertise && (
            <span className="rounded-full bg-[#e0f2fe] px-3 py-1 text-xs font-medium text-[#0369a1] shadow-xs truncate max-w-[155px]">
              {primaryExpertise}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Faculty Directory with Header Band Cards:
 * Navy header band grows taller and the card lifts with cyan border on hover.
 */
export function FacultyDirectory({ items }: { items: FacultyListItem[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const profile = searchParams.get("profile");
  const pushed = useRef(false);

  const urlWith = useCallback(
    (slug: string | null) => {
      const qs = new URLSearchParams(searchParams.toString());
      if (slug) qs.set("profile", slug);
      else qs.delete("profile");
      const s = qs.toString();
      return `${pathname}${s ? `?${s}` : ""}`;
    },
    [pathname, searchParams],
  );

  function open(slug: string) {
    window.history.pushState(null, "", urlWith(slug));
    pushed.current = true;
  }

  function close() {
    if (!profile) return;
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlWith(null));
    }
  }

  return (
    <>
      <ul className="mx-auto grid max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
        {items.map((f) => (
          <li key={f.id} className="w-full flex justify-center">
            <FacultyCard f={f} onOpen={open} />
          </li>
        ))}
      </ul>

      <FacultyProfileDialog slug={profile} onClose={close} />
    </>
  );
}
