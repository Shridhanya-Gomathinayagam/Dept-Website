import Link from "next/link";
import { apiGet, pickParams } from "@/lib/api";
import type { EventItem, Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, ResultCount } from "@/components/site/common";
import { EventCard } from "@/components/site/cards";

export async function generateMetadata() {
  return pageMetadata("Events", "Workshops, FDPs, guest lectures, seminars, conferences and more at the department.", "/events");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

// Category tabs; keys match the backend event "group" filter.
const GROUPS = [
  { key: "", label: "All Events" },
  { key: "workshops-seminars", label: "Workshops & Seminars" },
  { key: "symposiums-conferences", label: "Symposiums & Conferences" },
  { key: "club-activities", label: "Club Activities" },
  { key: "training", label: "Training & Visits" },
];

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const raw = pickParams(await searchParams, ["q", "event_type", "event_status", "when", "group", "page"]);
  const when = raw.when === "past" || raw.when === "all" ? raw.when : "upcoming";
  const group = GROUPS.find((g) => g.key === raw.group)?.key ?? "";
  if (!group) delete raw.group;
  const values: Record<string, string> = { ...raw, when };
  const [data] = await Promise.all([
    apiGet<Page<EventItem>>("/events", { ...values, when: when === "all" ? undefined : when, page_size: 12 }),
  ]);
  const { page, ...filters } = values;
  const tabs = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ];
  const tabHref = (next: { when?: string; group?: string }) => {
    const qs = new URLSearchParams();
    const g = next.group ?? group;
    if (g) qs.set("group", g);
    qs.set("when", next.when ?? when);
    return `/events?${qs.toString()}`;
  };

  return (
    <>
      <PageHeader eyebrow="Events & Opportunities" title="Department Events" description="Workshops, seminars, symposiums, conferences, club activities and training programmes." />
      <Container className="py-10">
        <nav aria-label="Event categories" className="-mx-4 mb-4 overflow-x-auto px-4">
          <ul className="flex min-w-max gap-1 border-b">
            {GROUPS.map((g) => (
              <li key={g.key}>
                <Link
                  href={tabHref({ group: g.key })}
                  aria-current={group === g.key ? "page" : undefined}
                  className={cn("-mb-px block border-b-2 px-4 py-2 text-sm font-medium", group === g.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Event timeframe" className="mb-6 flex gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={tabHref({ when: t.key })}
              aria-current={when === t.key ? "page" : undefined}
              className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", when === t.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <ResultCount total={data.total} noun="event" />
        {data.items.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.items.map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        ) : (
          <EmptyState title="No events found." hint={when === "upcoming" ? "There are no upcoming events at the moment. See past events instead." : "Try changing the filters."} />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/events" params={filters} />
      </Container>
    </>
  );
}
