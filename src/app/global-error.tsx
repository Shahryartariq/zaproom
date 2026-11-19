"use client";

import "./globals.css";

/** Last resort when the layout itself fails: a plain page with its own html and body. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | Zaproom</title>
        <meta name="robots" content="noindex" />
      </head>
      <body>
        <main className="state-screen">
          <div>
            <h1>Something went wrong</h1>
            <p>Zaproom couldn&apos;t load. Try again, or come back in a minute.</p>
            <div className="actions">
              <button className="btn primary" onClick={reset}>
                Try again
              </button>
              {/* A full reload on purpose: the app's own navigation may be what broke. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a className="btn" href="/">
                Go to the lobby
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
