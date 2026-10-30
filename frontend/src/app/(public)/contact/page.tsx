import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { getDepartment, pageMetadata } from "@/lib/site";
import { isSafeUrl } from "@/lib/format";
import { Container, EmptyState, PageHeader } from "@/components/site/common";

export async function generateMetadata() {
  return pageMetadata("Contact Us", "Address, email, phone and location of the department.", "/contact");
}

function mapSrc(url: string | null): string | null {
  // Only embed Google Maps (admin pastes the "Embed a map" URL).
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname.startsWith("/maps") ? url : null;
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const dept = await getDepartment();
  const map = mapSrc(dept?.map_embed_url ?? null);
  return (
    <>
      <PageHeader eyebrow="Get in touch" title="Contact Us" description={dept?.name} />
      <Container className="py-12">
        {!dept ? (
          <EmptyState title="Contact details have not been published yet." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              {dept.address && (
                <section className="flex gap-4 rounded-lg border bg-card p-6 shadow-sm">
                  <MapPin className="size-6 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Department Address</h2>
                    <address className="mt-1 whitespace-pre-line not-italic text-muted-foreground">{dept.address}</address>
                  </div>
                </section>
              )}
              {dept.college_address && (
                <section className="flex gap-4 rounded-lg border bg-card p-6 shadow-sm">
                  <MapPin className="size-6 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h2 className="font-heading text-lg font-semibold">{dept.college_name ?? "College Address"}</h2>
                    <address className="mt-1 whitespace-pre-line not-italic text-muted-foreground">{dept.college_address}</address>
                  </div>
                </section>
              )}
              <section className="grid gap-4 sm:grid-cols-2">
                {dept.email && (
                  <a href={`mailto:${dept.email}`} className="flex gap-3 rounded-lg border bg-card p-5 shadow-sm hover:border-primary/40">
                    <Mail className="size-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm text-muted-foreground">Email</span>
                      <span className="block break-words font-medium">{dept.email}</span>
                    </span>
                  </a>
                )}
                {dept.phone && (
                  <a href={`tel:${dept.phone.replace(/\s/g, "")}`} className="flex gap-3 rounded-lg border bg-card p-5 shadow-sm hover:border-primary/40">
                    <Phone className="size-5 shrink-0 text-primary" aria-hidden />
                    <span>
                      <span className="block text-sm text-muted-foreground">Phone</span>
                      <span className="block font-medium">{dept.phone}</span>
                    </span>
                  </a>
                )}
                {isSafeUrl(dept.college_website) && (
                  <a href={dept.college_website} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-lg border bg-card p-5 shadow-sm hover:border-primary/40">
                    <Globe className="size-5 shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm text-muted-foreground">College Website</span>
                      <span className="block truncate font-medium">{dept.college_website.replace(/^https?:\/\//, "")}</span>
                    </span>
                  </a>
                )}
              </section>
              {dept.social_links.length > 0 && (
                <section>
                  <h2 className="font-heading text-lg font-semibold">Social Media</h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {dept.social_links.filter((l) => isSafeUrl(l.url)).map((l) => (
                      <li key={l.url}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-md border px-4 py-2 text-sm hover:bg-muted">
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            {map && (
              <iframe
                src={map}
                title="Department location on Google Maps"
                className="min-h-80 w-full rounded-lg border shadow-sm lg:min-h-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        )}
      </Container>
    </>
  );
}
