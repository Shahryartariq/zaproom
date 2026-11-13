import type { Count } from "@/lib/admin.server";
import { num } from "./format";

/** A top-N list with a bar per row (a <meter>, so no inline widths). */
export function RankList({ title, rows, render }: { title: string; rows: Count[]; render?: (label: string) => React.ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="panel admin-rank">
      <h2>{title}</h2>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.label}>
              <span className="label">{render ? render(r.label) : r.label}</span>
              <span className="count">{num(r.count)}</span>
              <meter min={0} max={max} value={r.count} aria-hidden="true" />
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-empty">Nothing yet.</p>
      )}
    </section>
  );
}
