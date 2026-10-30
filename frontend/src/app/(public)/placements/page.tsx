import { apiGet, pickParams } from "@/lib/api";
import type { Page, Placement, PlacementSummary } from "@/lib/types";
import { formatLpa, isSafeUrl } from "@/lib/format";
import { pageMetadata } from "@/lib/site";
import { Container, EmptyState, PageHeader, Pagination, SectionHeading, TextBlock } from "@/components/site/common";
import { SmartImage } from "@/components/site/smart-image";

export async function generateMetadata() {
  return pageMetadata("Placements", "Year-wise placement statistics, recruiters and placed students.", "/placements");
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PlacementsPage({ searchParams }: { searchParams: SP }) {
  const values = pickParams(await searchParams, ["academic_year", "q", "page"]);
  const [summary, placed] = await Promise.all([
    apiGet<PlacementSummary>("/placements-summary", { academic_year: values.academic_year }),
    apiGet<Page<Placement>>("/placements", { ...values, page_size: 24 }),
  ]);
  const { page, ...filters } = values;
  const latest = summary.years[0];

  return (
    <>
      <PageHeader eyebrow="Careers" title="Placements" description="Placement statistics, recruiters and the career success of our students." />
      <Container className="space-y-14 py-10">
        {latest ? (
          <section id="highlights" aria-labelledby="latest-heading" className="scroll-mt-24">
            <h2 id="latest-heading" className="text-2xl font-semibold text-primary">Placement Highlights {latest.academic_year}</h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Placement Rate", value: latest.placement_percentage != null ? `${latest.placement_percentage}%` : "—" },
                { label: "Highest Package", value: formatLpa(latest.highest_package_lpa) },
                ...(latest.average_package_lpa != null ? [{ label: "Average Package", value: formatLpa(latest.average_package_lpa) }] : []),
                { label: "Students Placed", value: latest.students_placed != null ? String(latest.students_placed) : "—" },
                { label: "Companies Visited", value: latest.companies_visited != null ? `${latest.companies_visited}` : "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border-t-4 border-primary bg-card p-6 shadow-sm">
                  <dt className="text-sm text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 font-heading text-3xl font-semibold text-primary">{s.value}</dd>
                </div>
              ))}
            </dl>
            {latest.summary && <TextBlock text={latest.summary} className="mt-6 text-foreground/85" />}
          </section>
        ) : (
          <EmptyState title="Placement statistics have not been published yet." />
        )}

        {summary.years.length > 0 && (
          <section id="statistics" className="scroll-mt-24">
            <SectionHeading title="Placement Statistics" description="Year-wise placement record" />
            <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Placement statistics by academic year</caption>
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    {["Academic Year", "Eligible", "Placed", "Placement %", "Highest", "Average", "Companies"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.years.map((y) => (
                    <tr key={y.id}>
                      <th scope="row" className="px-4 py-3 font-medium">{y.academic_year}</th>
                      <td className="px-4 py-3">{y.eligible_students ?? "—"}</td>
                      <td className="px-4 py-3">{y.students_placed ?? "—"}</td>
                      <td className="px-4 py-3">{y.placement_percentage != null ? `${y.placement_percentage}%` : "—"}</td>
                      <td className="px-4 py-3">{formatLpa(y.highest_package_lpa)}</td>
                      <td className="px-4 py-3">{formatLpa(y.average_package_lpa)}</td>
                      <td className="px-4 py-3">{y.companies_visited ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {summary.recruiters.length > 0 && (
          <section id="recruiters" className="scroll-mt-24">
            <SectionHeading title="Recruiters & Partner Companies" />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {summary.recruiters.map((r) => (
                <li key={r.id} className="flex h-24 items-center justify-center rounded-lg border bg-card p-4 text-center shadow-sm">
                  {isSafeUrl(r.logo_url) ? (
                    <SmartImage src={r.logo_url} alt={r.name} width={200} className="max-h-14 w-auto object-contain" />
                  ) : (
                    <span className="font-heading font-semibold text-primary">{r.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary.companies.length > 0 && (
          <section>
            <SectionHeading title="Company-wise Placements" description={values.academic_year ? `Academic year ${values.academic_year}` : "All years"} />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.companies.map((c) => (
                <li key={c.company} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <span className="font-medium">{c.company}</span>
                  <span className="text-sm text-muted-foreground">
                    {c.offers} {c.offers === 1 ? "offer" : "offers"}
                    {c.highest_package_lpa != null && ` · up to ${formatLpa(c.highest_package_lpa)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="students-placed" className="scroll-mt-24">
          <SectionHeading title="Students Placed" />
          {placed.items.length ? (
            <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    {["Student", "Company", "Role", "Package", "Year"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {placed.items.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 font-medium">{p.student_name}</td>
                      <td className="px-4 py-3">{p.company}</td>
                      <td className="px-4 py-3">{p.role ?? "—"}</td>
                      <td className="px-4 py-3">{formatLpa(p.package_lpa)}</td>
                      <td className="px-4 py-3">{p.academic_year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No placement records found." />
          )}
          <Pagination page={placed.page} pages={placed.pages} basePath="/placements" params={filters} />
        </section>
      </Container>
    </>
  );
}
