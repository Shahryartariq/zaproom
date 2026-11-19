"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { takeMessages } from "@/lib/activity";

let firstView = true;

function send(body: unknown, beacon: boolean): Promise<Response> | void {
  const data = JSON.stringify(body);
  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/t", new Blob([data], { type: "application/json" }));
    return;
  }
  return fetch("/api/t", { method: "POST", headers: { "content-type": "application/json" }, body: data, keepalive: true });
}

/**
 * Reports page views and time spent to the site's own visitor log (/api/t). Only time
 * with the tab visible counts. The admin's own visits are ignored on the server.
 */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    let viewId: number | null = null;
    let visibleMs = 0;
    let since: number | null = document.visibilityState === "visible" ? performance.now() : null;
    let stopped = false;

    const seconds = () => Math.round((visibleMs + (since === null ? 0 : performance.now() - since)) / 1000);
    const report = () => {
      if (viewId) send({ type: "leave", viewId, seconds: seconds(), messages: takeMessages() }, true);
    };

    // Wait a moment so the page title is set and instant redirects don't count.
    const timer = window.setTimeout(() => {
      const referrer = firstView ? document.referrer : undefined;
      firstView = false;
      const scheme = document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const view = {
        type: "view",
        path: `${location.pathname}${location.search}`.slice(0, 500),
        title: document.title.slice(0, 200),
        referrer: referrer || undefined,
        screen: `${screen.width}x${screen.height}`,
        viewport: `${innerWidth}x${innerHeight}`,
        lang: navigator.language,
        langs: navigator.languages?.join(",").slice(0, 200),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        scheme: scheme === "dark" || scheme === "light" ? scheme : undefined,
      };
      void send(view, false)
        ?.then((r) => (r.status === 200 ? (r.json() as Promise<{ viewId?: number }>) : null))
        .then((d) => {
          if (!stopped && d?.viewId) viewId = d.viewId;
        })
        .catch(() => {});
    }, 400);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (since !== null) visibleMs += performance.now() - since;
        since = null;
        report();
      } else if (since === null) {
        since = performance.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", report);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", report);
      report();
    };
  }, [pathname]);

  return null;
}
