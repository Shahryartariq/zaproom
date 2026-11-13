import type { Metadata } from "next";
import Link from "next/link";
import { ago, num, when } from "@/components/admin/format";
import { PAGE_SIZE, listVisitors } from "@/lib/admin.server";
import { db } from "@/lib/db";
import { duration, flag } from "@/lib/visitors";

export const metadata: Metadata = { title: "Visitors" };

const DONE: Record<string, string> = { deleted: "Visitor deleted, with all their page views and activity." };
const ERRORS: Record<string, string> = { delete: "That visitor couldn't be deleted. Tick the box to confirm and try again." };

export default async function AdminVisitors({ searchParams }: PageProps<"/admin/visitors">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const bots = params.bots === "1";
  const page = Math.max(1, Number(params.page) || 1);
  const sql = await db();
  const { rows, total } = sql ? await listVisitors(sql, { q, bots, page }) : { rows: [], total: 0 };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/visitors?${new URLSearchParams({ ...(q ? { q } : {}), ...(bots ? { bots: "1" } : {}), page: String(p) })}`;
  const done = typeof params.done === "string" ? DONE[params.done] : undefined;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Visitors</h1>
        <form className="admin-filters" method="get" role="search">
          <label>
            <span className="sr-only">Search visitors</span>
            <input className="input" type="search" name="q" defaultValue={q} placeholder="IP, city, name, browser…" />
          </label>
          <label className="admin-check">
            <input type="checkbox" name="bots" value="1" defaultChecked={bots} /> Include bots
          </label>
          <button className="btn" type="submit">
            Search
          </button>
        </form>
      </header>
      {done ? <p className="admin-note" role="status">{done}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <p className="admin-muted">
        {num(total)} visitor{total === 1 ? "" : "s"}
        {q ? ` matching “${q}”` : ""}. Newest first.
      </p>

      <div className="admin-table-wrap" role="region" aria-label="Visitors table" tabIndex={0}>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Last seen</th>
              <th scope="col">Name</th>
              <th scope="col">IP</th>
              <th scope="col">Location</th>
              <th scope="col">Device</th>
              <th scope="col" className="num">Visits</th>
              <th scope="col" className="num">Pages</th>
              <th scope="col" className="num">Time</th>
              <th scope="col" className="num">Msgs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/admin/visitors/${v.id}`} title={when(v.last_seen)}>
                    {ago(v.last_seen)}
                  </Link>
                </td>
                <td>{v.names.length ? v.names.slice(-2).join(", ") : <span className="admin-muted">—</span>}</td>
                <td className="mono">{v.ip ?? "—"}</td>
                <td>
                  {flag(v.country)} {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                </td>
                <td>
                  {[v.browser, v.os].filter(Boolean).join(" on ") || "—"}
                  <span className="admin-muted"> · {v.device}</span>
                  {v.is_bot ? <span className="badge">bot</span> : null}
                </td>
                <td className="num">{v.sessions}</td>
                <td className="num">{v.page_views}</td>
                <td className="num">{duration(v.seconds)}</td>
                <td className="num">{v.messages}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length ? null : <p className="admin-empty">No visitors {q ? "match that search" : "recorded yet"}.</p>}
      </div>

      {pages > 1 ? (
        <nav className="admin-pager" aria-label="Pages">
          {page > 1 ? <Link href={link(page - 1)}>Newer</Link> : <span />}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={link(page + 1)}>Older</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
