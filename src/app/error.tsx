"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown when a page crashes. Keeps the header and footer, and offers a way back. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    document.title = "Something went wrong | Zaproom";
  }, [error]);

  return (
    <div className="state-screen">
      <div>
        <h1>Something went wrong</h1>
        <p>This page hit an error. Trying again usually fixes it.</p>
        {error.digest ? <p className="hint">Error code: {error.digest}</p> : null}
        <div className="actions">
          <button className="btn primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn" href="/">
            Go to the lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
