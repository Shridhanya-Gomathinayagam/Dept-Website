"use client";

import { useEffect } from "react";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="font-heading text-5xl font-semibold text-primary">Sorry</p>
      <h1 className="mt-4 text-2xl font-semibold">This page could not be loaded</h1>
      <p className="mt-2 text-muted-foreground">
        Something went wrong while loading the information. Please try again in a moment.
      </p>
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-cta px-5 py-2.5 font-medium text-cta-foreground hover:bg-cta-hover hover:text-cta-hover-foreground">
        Try again
      </button>
    </div>
  );
}
