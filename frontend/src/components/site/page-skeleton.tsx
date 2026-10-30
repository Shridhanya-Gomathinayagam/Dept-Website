import { Container } from "./common";

/**
 * Skeleton shown while a public list page fetches its content.
 * Used by loading.tsx of pages without in-page filters (filter changes would blank the whole page),
 * never at the (public) layout level: a layout-level
 * loading boundary starts streaming before notFound() runs, so missing detail pages would
 * answer 200 instead of 404.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <section className="border-b bg-muted">
        <Container className="py-10 sm:py-14">
          <div className="h-4 w-28 animate-pulse rounded bg-foreground/10" />
          <div className="mt-3 h-9 w-2/3 max-w-md animate-pulse rounded bg-foreground/15" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-foreground/10" />
        </Container>
      </section>
      <Container className="grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-foreground/10" />
        ))}
      </Container>
    </div>
  );
}
