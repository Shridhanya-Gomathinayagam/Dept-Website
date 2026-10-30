import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, MapPin, Mic, Phone, Users } from "lucide-react";
import { apiGetOrNull } from "@/lib/api";
import type { EventItem } from "@/lib/types";
import { formatDateTime, humanize, isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, Pill, TextBlock } from "@/components/site/common";
import { SmartImage } from "@/components/site/smart-image";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const e = await apiGetOrNull<EventItem>(`/events/${encodeURIComponent(id)}`);
  if (!e) notFound();
  const meta = await pageMetadata(e.title, e.description?.slice(0, 160) ?? `${e.event_type} on ${formatDateTime(e.start_at)}`, `/events/${e.slug}`);
  return { ...meta, openGraph: { ...meta.openGraph, images: e.poster_url ? [e.poster_url] : [] } };
}

export default async function EventDetail({ params }: { params: Params }) {
  const { id } = await params;
  const e = await apiGetOrNull<EventItem>(`/events/${encodeURIComponent(id)}`);
  if (!e) notFound();
  const facts = [
    { icon: CalendarDays, label: "When", value: `${formatDateTime(e.start_at)}${e.end_at ? ` – ${formatDateTime(e.end_at)}` : ""}` },
    e.venue && { icon: MapPin, label: "Venue", value: e.venue },
    e.speaker && { icon: Mic, label: "Speaker", value: e.speaker },
    e.organizer && { icon: Users, label: "Organizer", value: e.organizer },
    e.contact_info && { icon: Phone, label: "Contact", value: e.contact_info },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  return (
    <Container className="py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/events" className="hover:underline">Events</Link> <span aria-hidden>/</span> <span>{e.title}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <article>
          <div className="flex flex-wrap gap-2">
            <Pill tone="blue">{e.event_type}</Pill>
            <Pill tone={e.event_status === "CANCELLED" ? "red" : e.event_status === "UPCOMING" ? "green" : "default"}>{humanize(e.event_status)}</Pill>
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-primary sm:text-4xl">{e.title}</h1>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.label} className="flex gap-3 rounded-lg border bg-card p-4">
                <f.icon className="size-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5">{f.value}</dd>
                </div>
              </div>
            ))}
          </dl>
          {e.description && <TextBlock text={e.description} className="mt-8 text-lg text-foreground/85" />}
          {isSafeUrl(e.registration_url) && e.event_status !== "COMPLETED" && e.event_status !== "CANCELLED" && (
            <a href={e.registration_url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex h-11 items-center rounded-md bg-cta px-6 font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">
              Register now
            </a>
          )}
        </article>
        {isSafeUrl(e.poster_url) && (
          <SmartImage src={e.poster_url} alt={`Poster for ${e.title}`} width={760} className="w-full rounded-lg border shadow-sm" />
        )}
      </div>
    </Container>
  );
}
