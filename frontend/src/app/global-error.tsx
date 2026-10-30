"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1>500 · Something went wrong</h1>
          <p>The website is temporarily unavailable. Please try again shortly.</p>
          <button type="button" onClick={reset} style={{ padding: "10px 20px", marginTop: 12 }}>Try again</button>
        </main>
      </body>
    </html>
  );
}
