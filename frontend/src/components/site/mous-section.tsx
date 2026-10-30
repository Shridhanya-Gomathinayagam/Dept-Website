import { CalendarCheck, ExternalLink, FileText, Handshake } from "lucide-react";
import type { Mou } from "@/lib/types";
import { formatDate, initials, isSafeUrl } from "@/lib/format";
import { Container } from "./common";
import { SmartImage } from "./smart-image";

function isActive(m: Mou): boolean {
  if (!m.valid_until) return true;
  return new Date(`${m.valid_until}T23:59:59`) >= new Date();
}

/** Memoranda of understanding with partner organisations, as logo cards. */
export function MousSection({ mous }: { mous: Mou[] }) {
  if (!mous.length) return null;
  return (
    <section id="mous" aria-labelledby="mous-heading" className="scroll-mt-16 bg-muted py-16 lg:py-20">
      <Container>
        <div className="text-center">
          <h2 id="mous-heading" className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            MOUs &amp;{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-700 bg-clip-text text-transparent">Partnerships</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Agreements with industry and academic partners for internships, training, research and joint initiatives.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {mous.map((m) => {
            const active = isActive(m);
            return (
              <li
                key={m.id}
                className="group flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-900/10"
              >
                <div className="flex items-center gap-4">
                  <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-2">
                    {isSafeUrl(m.logo_url) ? (
                      <SmartImage src={m.logo_url} alt={`${m.organization} logo`} width={128} className="max-h-full w-auto object-contain" />
                    ) : (
                      <span className="font-heading text-lg font-extrabold text-primary" aria-hidden>{initials(m.organization)}</span>
                    )}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-bold leading-snug">{m.organization}</h3>
                    <span
                      className={
                        active
                          ? "mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200"
                          : "mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                      }
                    >
                      <Handshake className="size-3.5" aria-hidden /> {active ? "Active" : "Completed"}
                    </span>
                  </div>
                </div>

                {m.purpose && <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{m.purpose}</p>}

                {(m.signed_on || m.valid_until) && (
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden />
                    {m.signed_on && <>Signed {formatDate(m.signed_on)}</>}
                    {m.signed_on && m.valid_until && " · "}
                    {m.valid_until && <>Valid until {formatDate(m.valid_until)}</>}
                  </p>
                )}

                {(isSafeUrl(m.website_url) || isSafeUrl(m.document_url)) && (
                  // mt-auto + pt-4: links sit at the card bottom with a minimum gap above them.
                  <div className="mt-auto pt-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-sm font-medium">
                    {isSafeUrl(m.website_url) && (
                      <a href={m.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Website <ExternalLink className="size-3.5" aria-hidden />
                        <span className="sr-only">of {m.organization} (opens in a new tab)</span>
                      </a>
                    )}
                    {isSafeUrl(m.document_url) && (
                      <a href={m.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <FileText className="size-3.5" aria-hidden /> View MOU
                        <span className="sr-only">with {m.organization} (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
