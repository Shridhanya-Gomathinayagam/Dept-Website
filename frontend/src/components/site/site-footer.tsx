import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { Department } from "@/lib/types";
import { isSafeUrl } from "@/lib/format";

// Pages that are not top-level navbar menus are listed here so they stay one click away.
const QUICK_LINKS = [
  { label: "About the Department", href: "/#about" },
  { label: "Academics", href: "/academics" },
  { label: "Students", href: "/students" },
  { label: "Alumni", href: "/alumni" },
  { label: "News & Announcements", href: "/news" },
  { label: "Opportunity Hub", href: "/opportunities" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter({ dept }: { dept: Department | null }) {
  const year = new Date().getFullYear();
  return (
    <footer className="theme-dark mt-16 border-t-2 border-highlight/60 bg-band text-band-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="font-heading text-xl font-semibold">{dept?.name ?? "Department"}</p>
          {dept?.college_name && <p className="mt-1 text-sm text-band-foreground/75">{dept.college_name}</p>}
          {dept?.tagline && <p className="mt-4 max-w-md text-sm text-band-foreground/80">{dept.tagline}</p>}
          <ul className="mt-5 space-y-2 text-sm text-band-foreground/85">
            {dept?.address && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="whitespace-pre-line">{dept.address}</span>
              </li>
            )}
            {dept?.email && (
              <li className="flex gap-2">
                <Mail className="mt-0.5 size-4 shrink-0" aria-hidden />
                <a href={`mailto:${dept.email}`} className="hover:underline">
                  {dept.email}
                </a>
              </li>
            )}
            {dept?.phone && (
              <li className="flex gap-2">
                <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
                <a href={`tel:${dept.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {dept.phone}
                </a>
              </li>
            )}
          </ul>
        </div>
        <nav aria-label="Quick links">
          <p className="text-sm font-semibold uppercase tracking-wider text-highlight">Explore</p>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-band-foreground/85 hover:text-band-foreground hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          {!!dept?.important_links.length && (
            <>
              <p className="text-sm font-semibold uppercase tracking-wider text-highlight">Important Links</p>
              <ul className="mt-4 space-y-2 text-sm">
                {dept.important_links.filter((l) => isSafeUrl(l.url)).map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-band-foreground/85 hover:underline">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!!dept?.social_links.length && (
            <>
              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-highlight">Follow Us</p>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {dept.social_links.filter((l) => isSafeUrl(l.url)).map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded border border-band-foreground/30 px-3 py-1 hover:bg-band-foreground/10">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-band-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-band-foreground/70 sm:flex-row sm:justify-between sm:px-6">
          <p>
            © {year} {dept?.college_name ?? dept?.name ?? "Department"}. All rights reserved.
          </p>
          {dept?.college_website && isSafeUrl(dept.college_website) && (
            <a href={dept.college_website} target="_blank" rel="noopener noreferrer" className="hover:underline">
              College website
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
