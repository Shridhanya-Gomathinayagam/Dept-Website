import Link from "next/link";
import { Award, CalendarDays, Clock, ExternalLink as ExtIcon, FileText, MapPin, Mic, Trophy } from "lucide-react";
import type { EventItem, FacultyAchievement, NewsListItem, StudentAchievement } from "@/lib/types";
import { facultyHref } from "@/lib/links";
import { dateParts, formatDate, formatTime, humanize, isSafeUrl } from "@/lib/format";
import { Pill, Tags } from "./common";
import { SmartImage } from "./smart-image";

const LEVEL_TONE: Record<string, "highlight" | "blue" | "default"> = { International: "highlight", National: "highlight", State: "blue" };

export function EventCard({ e }: { e: EventItem }) {
  const d = dateParts(e.start_at);
  const tone = e.event_status === "CANCELLED" ? "red" : e.event_status === "UPCOMING" ? "green" : "default";
  return (
    <article className="flex gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-primary py-2 text-primary-foreground" aria-hidden>
        <span className="text-2xl font-semibold leading-none">{d.day}</span>
        <span className="text-xs uppercase">{d.month}</span>
        <span className="text-[0.65rem] opacity-75">{d.year}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="blue">{e.event_type}</Pill>
          <Pill tone={tone}>{humanize(e.event_status)}</Pill>
        </div>
        <h3 className="mt-2 font-heading text-lg font-semibold leading-snug">
          <Link href={`/events/${e.slug}`} className="hover:text-primary hover:underline">
            {e.title}
          </Link>
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            <time dateTime={e.start_at}>{formatDate(e.start_at)}</time>
            <Clock className="ml-2 size-4" aria-hidden /> {formatTime(e.start_at)}
          </li>
          {e.venue && (
            <li className="flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden /> {e.venue}
            </li>
          )}
          {e.speaker && (
            <li className="flex items-center gap-1.5">
              <Mic className="size-4" aria-hidden /> {e.speaker}
            </li>
          )}
        </ul>
      </div>
    </article>
  );
}

export function StudentAchievementCard({ a }: { a: StudentAchievement }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      {isSafeUrl(a.image_url) ? (
        <SmartImage src={a.image_url} alt={a.title} width={600} className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-primary to-primary/80" aria-hidden>
          <Trophy className="size-12 text-highlight" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          <Pill tone={LEVEL_TONE[a.level] ?? "default"}>{a.level}</Pill>
          <Pill>{a.category}</Pill>
          <Pill>{a.year}</Pill>
        </div>
        <h3 className="mt-3 font-heading text-lg font-semibold leading-snug text-primary">{a.title}</h3>
        {a.position && <p className="mt-1 text-sm font-semibold text-accent-foreground">{a.position}</p>}
        <p className="mt-2 text-sm">
          <span className="font-medium">{a.team_name ? `${a.team_name}: ` : ""}</span>
          {a.participants}
        </p>
        {(a.event_name || a.organizer) && (
          <p className="mt-1 text-sm text-muted-foreground">{[a.event_name, a.organizer].filter(Boolean).join(" · ")}</p>
        )}
        {a.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.description}</p>}
        <div className="mt-auto flex flex-wrap gap-3 pt-3 text-sm">
          {isSafeUrl(a.certificate_url) && (
            <a href={a.certificate_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <FileText className="size-4" aria-hidden /> Certificate
            </a>
          )}
          {isSafeUrl(a.external_url) && (
            <a href={a.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ExtIcon className="size-4" aria-hidden /> Details
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function FacultyAchievementCard({ a }: { a: FacultyAchievement }) {
  return (
    <article className="flex gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground" aria-hidden>
        <Award className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="blue">{a.category}</Pill>
          {a.level && <Pill tone={LEVEL_TONE[a.level] ?? "default"}>{a.level}</Pill>}
          <Pill>{a.year}</Pill>
        </div>
        <h3 className="mt-2 font-heading text-lg font-semibold leading-snug">{a.title}</h3>
        {a.faculty && (
          <p className="mt-1 text-sm">
            <Link href={facultyHref(a.faculty.slug)} className="font-medium text-primary hover:underline">
              {a.faculty.name}
            </Link>
            {a.organization && <span className="text-muted-foreground"> · {a.organization}</span>}
          </p>
        )}
        {a.description && <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>}
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          {a.date && <span className="text-muted-foreground">{formatDate(a.date)}</span>}
          {isSafeUrl(a.document_url) && (
            <a href={a.document_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Document
            </a>
          )}
          {isSafeUrl(a.external_url) && (
            <a href={a.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Link
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function NewsCard({ n }: { n: NewsListItem }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      {isSafeUrl(n.cover_image_url) ? (
        <SmartImage src={n.cover_image_url} alt="" width={640} className="aspect-[16/9] w-full object-cover" />
      ) : (
        <div className="aspect-[16/9] bg-secondary" aria-hidden />
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
          {n.category} · <time dateTime={n.published_on}>{formatDate(n.published_on)}</time>
        </p>
        <h3 className="mt-2 font-heading text-lg font-semibold leading-snug">
          <Link href={`/news/${n.slug}`} className="after:absolute after:inset-0 group-hover:text-primary group-hover:underline">
            {n.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.summary}</p>
      </div>
    </article>
  );
}

export { Tags };
