import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { when } from "@/components/admin/format";
import { visitorDetail } from "@/lib/admin.server";
import { db } from "@/lib/db";
import { EVENT_LABELS, duration, flag, isUuid } from "@/lib/visitors";

export const metadata: Metadata = { title: "Visitor" };

export default async function AdminVisitor({ params }: PageProps<"/admin/visitors/[id]">) {
  const { id } = await params;
  const sql = await db();
  if (!sql || !isUuid(id)) notFound();
  const found = await visitorDetail(sql, id);
  if (!found) notFound();
  const { visitor: v, timeline } = found;
  const map = v.latitude !== null && v.longitude !== null ? `https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=10/${v.latitude}/${v.longitude}` : null;

  const facts: [string, React.ReactNode][] = [
    ["Names used", v.names.length ? v.names.join(", ") : "—"],
    ["First seen", when(v.first_seen)],
    ["Last seen", when(v.last_seen)],
    ["Visits", String(v.sessions)],
    ["Page views", String(v.page_views)],
    ["Time on site", duration(v.seconds)],
    ["Messages sent", String(v.messages)],
    ["IP address", <span className="mono" key="ip">{v.ip ?? "—"}</span>],
    ["Other IPs", v.ips.filter((ip) => ip !== v.ip).join(", ") || "—"],
    [
      "Location",
      <span key="loc">
        {flag(v.country)} {[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}
        {map ? (
          <>
            {" "}
            <a href={map} rel="noreferrer noopener" target="_blank">
              Map
            </a>
          </>
        ) : null}
      </span>,
    ],
    ["Time zone", [v.timezone, v.client_timezone && v.client_timezone !== v.timezone ? `(browser: ${v.client_timezone})` : ""].filter(Boolean).join(" ") || "—"],
    ["Browser", [v.browser, v.browser_version].filter(Boolean).join(" ") || "—"],
    ["System", [v.os, v.os_version].filter(Boolean).join(" ") || "—"],
    ["Device", [v.device, v.device_vendor, v.device_model].filter(Boolean).join(" · ") || "—"],
    ["Screen / window", [v.screen, v.viewport].filter(Boolean).join(" / ") || "—"],
    ["Language", v.languages ?? v.language ?? "—"],
    ["Theme", v.color_scheme ?? "—"],
    ["Came from", v.first_referrer ?? "Direct"],
    ["First page", v.first_landing ?? "—"],
    ["Campaign", [v.utm_source, v.utm_medium, v.utm_campaign].filter(Boolean).join(" / ") || "—"],
    ["Bot", v.is_bot ? "Yes" : "No"],
    ["User agent", <span className="mono small" key="ua">{v.user_agent ?? "—"}</span>],
    ["Visitor id", <span className="mono small" key="id">{v.id}</span>],
  ];

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <p className="admin-muted">
            <Link href="/admin/visitors">Visitors</Link> /
          </p>
          <h1>{v.names.at(-1) ?? `Visitor from ${v.city ?? v.country ?? "somewhere"}`}</h1>
        </div>
      </header>

      <div className="admin-detail">
        <section className="panel">
          <h2>Details</h2>
          <dl className="admin-facts">
            {facts.map(([k, val]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          <details className="admin-danger">
            <summary>Delete this visitor</summary>
            <form method="post" action="/api/admin/visitors">
              <input type="hidden" name="id" value={v.id} />
              <label className="admin-check">
                <input type="checkbox" name="confirm" value="delete" required /> Delete their details, page views and activity. This can&apos;t be undone.
              </label>
              <button className="btn danger" type="submit">
                Delete visitor
              </button>
            </form>
          </details>
        </section>

        <section className="panel">
          <h2>Timeline</h2>
          {timeline.length ? (
            <ol className="admin-timeline">
              {timeline.map((t, i) =>
                t.kind === "view" ? (
                  <li key={i}>
                    <time dateTime={t.at.toISOString()}>{when(t.at)}</time>
                    <span>
                      Viewed <strong className="mono">{t.path}</strong>
                      {t.title ? <span className="admin-muted"> · {t.title}</span> : null}
                    </span>
                    <span className="admin-muted">
                      {t.seconds !== null ? duration(t.seconds) : "—"}
                      {t.messages ? ` · ${t.messages} msg` : ""}
                      {t.referrer ? ` · from ${t.referrer}` : ""}
                      {t.ip && t.ip !== v.ip ? ` · ${t.ip}` : ""}
                    </span>
                  </li>
                ) : (
                  <li key={i} className="event">
                    <time dateTime={t.at.toISOString()}>{when(t.at)}</time>
                    <span>
                      {EVENT_LABELS[t.type] ?? t.type}
                      {t.name ? <> as <strong>{t.name}</strong></> : null}
                      {typeof t.detail?.title === "string" ? ` · “${t.detail.title}”` : ""}
                      {typeof t.detail?.kind === "string" ? ` · ${t.detail.kind}` : ""}
                    </span>
                    <span className="admin-muted mono">{t.room ?? ""}</span>
                  </li>
                ),
              )}
            </ol>
          ) : (
            <p className="admin-empty">No activity recorded.</p>
          )}
        </section>
      </div>
    </div>
  );
}
