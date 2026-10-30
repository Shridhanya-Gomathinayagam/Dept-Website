import { CalendarClock, ExternalLink as ExtIcon, Globe, MapPin, ShieldCheck, Trophy, Users } from "lucide-react";
import { apiGet, pickParams } from "@/lib/api";
import type { Opportunity, Page } from "@/lib/types";
import { formatDate, humanize, isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, Pill, ResultCount } from "@/components/site/common";

export async function generateMetadata() {
  return pageMetadata("Opportunity Hub", "Hackathons, coding contests, symposiums, conferences, internships and scholarships for students, verified by the department.", "/opportunities");
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const KEYS = ["q", "category", "state", "city", "mode", "month", "registration", "eligibility", "organizer", "page"];

const REG_TONE = { OPEN: "green", CLOSING_SOON: "highlight", CLOSED: "red" } as const;

export default async function OpportunitiesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const raw = pickParams(sp, KEYS);
  // Default view: registrations still open (explicit "ANY" shows everything).
  const values: Record<string, string> = { ...raw, registration: raw.registration ?? "OPEN" };
  const [data] = await Promise.all([
    apiGet<Page<Opportunity>>("/opportunities", {
      ...values,
      registration: values.registration === "ANY" ? undefined : values.registration,
      page_size: 12,
    }),
  ]);
  const { page, ...filters } = values;

  return (
    <>
      <PageHeader
        eyebrow="Opportunity Hub"
        title="Opportunities Beyond the Department"
        description="Hackathons, coding contests, symposiums, paper presentations, workshops, internships and scholarships, each verified by the department before publishing."
      />
      <Container className="py-10">
        <ResultCount total={data.total} noun="opportunity" />
        {data.items.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {data.items.map((o) => (
              <article key={o.id} className="flex flex-col rounded-lg border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="blue">{o.category}</Pill>
                  <Pill>{humanize(o.mode)}</Pill>
                  <Pill tone={REG_TONE[o.registration_status]}>Registration {humanize(o.registration_status).toLowerCase()}</Pill>
                </div>
                <h2 className="mt-3 font-heading text-xl font-semibold leading-snug text-primary">{o.title}</h2>
                <p className="text-sm font-medium">
                  {o.organizer}
                  {o.institution && <span className="text-muted-foreground"> · {o.institution}</span>}
                </p>
                <ul className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                  {(o.city || o.state) && (
                    <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {[o.city, o.state, o.country !== "India" ? o.country : null].filter(Boolean).join(", ")}</li>
                  )}
                  {o.start_date && (
                    <li className="flex items-center gap-1.5">
                      <CalendarClock className="size-4" aria-hidden /> {formatDate(o.start_date)}
                      {o.end_date && o.end_date !== o.start_date && ` – ${formatDate(o.end_date)}`}
                    </li>
                  )}
                  {o.registration_deadline && (
                    <li className="flex items-center gap-1.5 font-medium text-foreground">
                      <CalendarClock className="size-4" aria-hidden /> Register by {formatDate(o.registration_deadline)}
                    </li>
                  )}
                  {o.team_size && <li className="flex items-center gap-1.5"><Users className="size-4" aria-hidden /> Team: {o.team_size}</li>}
                  {o.prize_info && <li className="flex items-center gap-1.5 sm:col-span-2"><Trophy className="size-4" aria-hidden /> {o.prize_info}</li>}
                </ul>
                {o.eligibility && <p className="mt-2 text-sm"><span className="font-medium">Eligibility:</span> {o.eligibility}</p>}
                {o.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{o.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  {o.registration_status !== "CLOSED" && isSafeUrl(o.registration_url) && (
                    <a href={o.registration_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-cta px-4 text-sm font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">
                      Register <ExtIcon className="size-3.5" aria-hidden />
                    </a>
                  )}
                  {isSafeUrl(o.website_url) && (
                    <a href={o.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Globe className="size-4" aria-hidden /> Official website
                    </a>
                  )}
                </div>
                <p className="mt-3 flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-700" aria-hidden />
                  Verified {formatDate(o.last_verified_at)} ·{" "}
                  <a href={o.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">source</a>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No opportunities found." hint="Check back soon for new hackathons and competitions." />
        )}
        <Pagination page={data.page} pages={data.pages} basePath="/opportunities" params={filters} />
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Listings are added and verified by department administrators. Always confirm details on the official website before registering.
        </p>
      </Container>
    </>
  );
}
