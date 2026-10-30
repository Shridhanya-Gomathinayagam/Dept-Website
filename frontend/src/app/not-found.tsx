import Link from "next/link";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-heading text-6xl font-semibold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The page may have been moved, unpublished or never existed. Check the address or start again from the home page.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-md bg-cta px-5 py-2.5 font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">Go to home page</Link>
        <Link href="/search" className="rounded-md border px-5 py-2.5 font-medium hover:bg-muted">Search the site</Link>
      </div>
    </main>
  );
}
