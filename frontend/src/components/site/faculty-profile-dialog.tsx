"use client";

import { useEffect, useRef, useState } from "react";
import { Award, BookOpen, Briefcase, ExternalLink, FileBadge, GraduationCap, Lightbulb, Loader2, Mail, X } from "lucide-react";
import type { Faculty, FacultyAchievement, Page, Patent, Publication } from "@/lib/types";
import { formatDate, humanize, isSafeUrl } from "@/lib/format";
import { Avatar, Pill, Tags } from "./common";

interface ProfileData {
  faculty: Faculty;
  achievements: FacultyAchievement[];
  publications: Page<Publication>;
  patents: Patent[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(res.status === 404 ? "This faculty profile is not available." : "Could not load the profile.");
  return res.json();
}

async function loadProfile(slug: string): Promise<ProfileData> {
  const faculty = await getJson<Faculty>(`/faculty/${encodeURIComponent(slug)}`);
  const [achievements, publications, patents] = await Promise.all([
    getJson<Page<FacultyAchievement>>(`/faculty-achievements?faculty_id=${faculty.id}&page_size=20`),
    getJson<Page<Publication>>(`/publications?faculty_id=${faculty.id}&page_size=20`),
    getJson<Page<Patent>>(`/patents?faculty_id=${faculty.id}&page_size=20`),
  ]);
  return { faculty, achievements: achievements.items, publications, patents: patents.items };
}

function Block({ title, icon: Icon, children }: { title: string; icon?: typeof Award; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h3 className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
        {Icon && <Icon className="size-5 text-primary" aria-hidden />}
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TextBlockSection({ title, text, icon }: { title: string; text: string | null; icon?: typeof Award }) {
  if (!text) return null;
  return (
    <Block title={title} icon={icon}>
      <p className="whitespace-pre-line text-sm leading-6 text-foreground/85">{text}</p>
    </Block>
  );
}

function ProfileBody({ data }: { data: ProfileData }) {
  const { faculty: f, achievements, publications, patents } = data;
  const links = [
    { href: f.google_scholar_url, label: "Google Scholar" },
    { href: f.orcid_url, label: "ORCID" },
    { href: f.linkedin_url, label: "LinkedIn" },
  ].filter((l) => isSafeUrl(l.href));
  const facts = [
    f.qualification && { icon: GraduationCap, text: f.qualification },
    f.experience_years != null && { icon: Briefcase, text: `${f.experience_years} years of experience` },
    f.specialization && { icon: BookOpen, text: f.specialization },
  ].filter(Boolean) as { icon: typeof Award; text: string }[];

  return (
    <>
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-band to-band/85 px-6 pb-6 pt-8 text-band-foreground sm:px-8">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-highlight/15" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
          <Avatar src={f.photo_url} name={f.name} size={240} className="size-32 shrink-0 text-4xl ring-4 ring-highlight/70 sm:size-36" />
          <div className="min-w-0">
            <h2 id="faculty-dialog-title" className="text-2xl font-semibold text-band-foreground sm:text-3xl">{f.name}</h2>
            <p className="mt-1 text-lg font-medium text-highlight">{f.designation}</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-sm text-band-foreground/85 sm:justify-start">
              {facts.map((x) => (
                <li key={x.text} className="flex items-center gap-1.5">
                  <x.icon className="size-4" aria-hidden /> {x.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {(f.email || links.length > 0) && (
          <div className="relative mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            {f.email && (
              <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1.5 rounded-md bg-band-foreground/10 px-3 py-1.5 text-sm ring-1 ring-band-foreground/25 hover:bg-band-foreground/20">
                <Mail className="size-4" aria-hidden /> {f.email}
              </a>
            )}
            {links.map((l) => (
              <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-band-foreground/10 px-3 py-1.5 text-sm ring-1 ring-band-foreground/25 hover:bg-band-foreground/20">
                {l.label} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ))}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="grid gap-5 bg-muted/40 p-5 sm:p-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-5">
          <TextBlockSection title="About" text={f.bio} />

          {achievements.length > 0 && (
            <Block title="Achievements" icon={Award}>
              <ul className="space-y-3">
                {achievements.map((a) => (
                  <li key={a.id} className="border-l-2 border-primary pl-3">
                    <p className="font-medium leading-snug">{a.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Pill tone="blue">{a.category}</Pill>
                      {a.level && <Pill tone="highlight">{a.level}</Pill>}
                      <span>{a.date ? formatDate(a.date) : a.year}</span>
                      {a.organization && <span>· {a.organization}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {publications.items.length > 0 && (
            <Block title={`Publications (${publications.total})`} icon={BookOpen}>
              <ol className="space-y-3">
                {publications.items.map((p) => (
                  <li key={p.id} className="text-sm">
                    <p className="font-medium leading-snug">
                      {isSafeUrl(p.url) ? (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">{p.title}</a>
                      ) : (
                        p.title
                      )}
                    </p>
                    <p className="text-muted-foreground">
                      {[p.authors, p.venue, p.year, humanize(p.pub_type), p.indexing].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          {patents.length > 0 && (
            <Block title="Patents" icon={FileBadge}>
              <ul className="space-y-2 text-sm">
                {patents.map((p) => (
                  <li key={p.id}>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground">
                      {[humanize(p.patent_status), p.year, p.patent_no ?? p.application_no].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          <TextBlockSection title="Publications (summary)" text={f.publications_summary} icon={BookOpen} />
          <TextBlockSection title="Patents (summary)" text={f.patents_summary} icon={FileBadge} />
          <TextBlockSection title="Projects Guided" text={f.projects_guided} icon={Lightbulb} />
        </div>

        <aside className="space-y-5">
          {f.research_interests.length > 0 && (
            <Block title="Research Interests" icon={Lightbulb}>
              <Tags items={f.research_interests} />
            </Block>
          )}
          <TextBlockSection title="Awards" text={f.awards} icon={Award} />
          <TextBlockSection title="Certifications" text={f.certifications} />
          <TextBlockSection title="Workshops & Conferences" text={f.workshops} />
          <TextBlockSection title="FDPs" text={f.fdps} />
        </aside>
      </div>
    </>
  );
}

/** Modal faculty profile over a frosted-glass backdrop. Opens when `slug` is set. */
export function FacultyProfileDialog({ slug, onClose }: { slug: string | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<{ slug: string; data?: ProfileData; error?: string } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (slug && !dialog.open) dialog.showModal();
    if (!slug && dialog.open) dialog.close();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState({ slug });
    loadProfile(slug)
      .then((data) => !cancelled && setState({ slug, data }))
      .catch((e: Error) => !cancelled && setState({ slug, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const current = state?.slug === slug ? state : null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="faculty-dialog-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[92vh] w-[min(64rem,94vw)] max-w-none overflow-hidden rounded-2xl border border-white/40 bg-background p-0 text-foreground shadow-2xl backdrop:bg-slate-900/25 backdrop:backdrop-blur-md open:animate-in open:fade-in-0 open:zoom-in-95"
    >
      <div className="relative max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/25 p-2 text-white backdrop-blur hover:bg-black/40"
          aria-label="Close profile"
        >
          <X className="size-5" />
        </button>
        {current?.data ? (
          <ProfileBody data={current.data} />
        ) : current?.error ? (
          <div className="p-10 text-center">
            <h2 id="faculty-dialog-title" className="text-xl font-semibold">Profile unavailable</h2>
            <p className="mt-2 text-muted-foreground">{current.error}</p>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-10 text-muted-foreground" role="status">
            <Loader2 className="size-7 animate-spin" aria-hidden />
            <h2 id="faculty-dialog-title" className="text-sm">Loading profile…</h2>
          </div>
        )}
      </div>
    </dialog>
  );
}
