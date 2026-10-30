"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import type { FacultyListItem } from "@/lib/types";
import { facultyHref } from "@/lib/links";
import { Avatar } from "./common";
import { FacultyProfileDialog } from "./faculty-profile-dialog";

/**
 * Faculty cards that open the profile in a popup on the same page.
 * The open profile is kept in the URL (?profile=slug) so it can be shared and Back closes it.
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
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((f) => (
          <li key={f.id}>
            <a
              href={facultyHref(f.slug)}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                open(f.slug);
              }}
              aria-haspopup="dialog"
              className="group flex h-full flex-col items-center rounded-lg border bg-card p-6 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <Avatar src={f.photo_url} name={f.name} size={128} className="size-28 text-2xl" />
              <h2 className="mt-4 font-heading text-lg font-semibold text-primary group-hover:underline">{f.name}</h2>
              <p className="text-sm font-medium text-accent-foreground">{f.designation}</p>
              {f.qualification && <p className="mt-1 text-sm text-muted-foreground">{f.qualification}</p>}
              {f.specialization && <p className="mt-2 line-clamp-2 text-sm">{f.specialization}</p>}
              <span className="mt-auto pt-4 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                View profile
              </span>
            </a>
          </li>
        ))}
      </ul>
      <FacultyProfileDialog slug={profile} onClose={close} />
    </>
  );
}
