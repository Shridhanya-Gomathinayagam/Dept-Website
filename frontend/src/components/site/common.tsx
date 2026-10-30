import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials, isSafeUrl } from "@/lib/format";
import { SmartImage } from "./smart-image";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description?: string | null;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="theme-dark relative isolate overflow-hidden bg-gradient-to-br from-[#0a1128] to-[#020817]">
      <div className="pointer-events-none absolute -right-24 -top-24 -z-10 size-96 rounded-full bg-sky-500/20 mix-blend-screen blur-3xl" aria-hidden />
      <Container className="py-12 sm:py-16">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-highlight">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-base text-muted-foreground sm:text-lg">{description}</p>}
        {children}
      </Container>
    </section>
  );
}

export function SectionHeading({
  title,
  href,
  linkLabel = "View all",
  description,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2>
        <div className="mt-2 h-1 w-12 rounded bg-gradient-to-r from-sky-400 to-cta" aria-hidden />
        {description && <p className="mt-3 text-muted-foreground">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="text-sm font-medium text-primary hover:underline">
          {linkLabel} <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed bg-card px-6 py-14 text-center">
      <SearchX className="size-10 text-muted-foreground" aria-hidden />
      <p className="mt-4 font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Tags({ items, className }: { items: string[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((t) => (
        <li key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "highlight" | "green" | "red" | "blue" }) {
  const tones = {
    default: "bg-muted text-foreground/80",
    highlight: "bg-accent text-accent-foreground",
    green: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    red: "bg-red-50 text-red-800 ring-1 ring-red-200",
    blue: "bg-secondary text-secondary-foreground",
  };
  return <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Avatar({ src, name, size = 96, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  if (isSafeUrl(src)) {
    return <SmartImage src={src} alt={`Photo of ${name}`} width={size} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("flex items-center justify-center rounded-full bg-secondary font-heading font-semibold text-secondary-foreground", className)}
    >
      {initials(name)}
    </span>
  );
}

export function Markdown({ children }: { children: string }) {
  // Raw HTML is never rendered (XSS-safe); only Markdown formatting.
  return (
    <div className="prose-content">
      <ReactMarkdown
        skipHtml
        urlTransform={(url) => (url.startsWith("#") || url.startsWith("mailto:") || isSafeUrl(url) ? url : "")}
        components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** Plain text with preserved line breaks (for admin-entered multi-line fields). */
export function TextBlock({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  return <p className={cn("whitespace-pre-line leading-7", className)}>{text}</p>;
}

export function ExternalLink({ href, children, className }: { href?: string | null; children: React.ReactNode; className?: string }) {
  if (!isSafeUrl(href)) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("text-primary hover:underline", className)}>
      {children}
    </a>
  );
}

export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number;
  pages: number;
  basePath: string;
  params: Record<string, string>;
}) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams({ ...params, page: String(p) });
    return `${basePath}?${qs.toString()}`;
  };
  const nums = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const linkCls = "flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted";
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={href(page - 1)} className={linkCls} rel="prev">
          <ChevronLeft className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Previous</span>
        </Link>
      )}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center gap-1.5">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(linkCls, n === page && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages && (
        <Link href={href(page + 1)} className={linkCls} rel="next">
          <span className="sr-only sm:not-sr-only">Next</span> <ChevronRight className="size-4" aria-hidden />
        </Link>
      )}
    </nav>
  );
}

export function ResultCount({ total, noun }: { total: number; noun: string }) {
  return (
    <p className="mb-4 text-sm text-muted-foreground" role="status">
      {total} {total === 1 ? noun : `${noun}s`} found
    </p>
  );
}
