/**
 * Visitors (solid) and page views (outline) per day, drawn as plain SVG so it needs no
 * script and no inline styles.
 */
export function DayChart({ days }: { days: { day: string; visitors: number; views: number }[] }) {
  const W = 720;
  const H = 180;
  const pad = 22;
  const max = Math.max(1, ...days.map((d) => d.views));
  const slot = (W - pad) / Math.max(1, days.length);
  const bar = Math.max(2, Math.min(28, slot * 0.7));
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const label = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const total = days.reduce((a, d) => a + d.visitors, 0);

  return (
    <figure className="admin-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Visitors per day: ${total} in total, busiest day ${max} page views.`}>
        <line x1={pad} x2={W} y1={H - pad} y2={H - pad} className="axis" />
        <text x={0} y={pad - 6} className="tick">
          {max}
        </text>
        {days.map((d, i) => {
          const x = pad + i * slot + (slot - bar) / 2;
          return (
            <g key={d.day}>
              <title>{`${label(d.day)}: ${d.visitors} visitor${d.visitors === 1 ? "" : "s"}, ${d.views} page view${d.views === 1 ? "" : "s"}`}</title>
              <rect x={x} y={y(d.views)} width={bar} height={H - pad - y(d.views)} className="views" rx={2} />
              <rect x={x} y={y(d.visitors)} width={bar} height={H - pad - y(d.visitors)} className="visitors" rx={2} />
            </g>
          );
        })}
        {days.length ? (
          <>
            <text x={pad} y={H - 4} className="tick">
              {label(days[0]!.day)}
            </text>
            <text x={W} y={H - 4} className="tick end">
              {label(days[days.length - 1]!.day)}
            </text>
          </>
        ) : null}
      </svg>
      <figcaption>
        <span className="key visitors" /> Visitors <span className="key views" /> Page views
      </figcaption>
    </figure>
  );
}
