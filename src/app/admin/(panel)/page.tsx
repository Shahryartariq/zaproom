import type { Metadata } from "next";
import Link from "next/link";
import { DayChart } from "@/components/admin/DayChart";
import { RankList } from "@/components/admin/RankList";
import { ago, num } from "@/components/admin/format";
import { RANGES, overview, parseRange, recentEvents } from "@/lib/admin.server";
import { liveKitConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { lobbySnapshot } from "@/lib/livekit.server";
import { EVENT_LABELS, duration, flag } from "@/lib/visitors";

export const metadata: Metadata = { title: "Overview" };

const COUNTRY = new Intl.DisplayNames(["en"], { type: "region" });
const countryName = (code: string) => {
  try {
    return /^[A-Z]{2}$/.test(code) ? `${flag(code)} ${COUNTRY.of(code) ?? code}` : code;
  } catch {
    return code;
  }
};

export default async function AdminOverview({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const bots = params.bots === "1";
  const sql = await db();
  const cfg = liveKitConfig();
  const [data, events, live] = await Promise.all([
    sql ? overview(sql, range, bots) : null,
    sql ? recentEvents(sql, 20) : [],
    cfg ? lobbySnapshot(cfg).catch(() => null) : null,
  ]);

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Overview</h1>
        <form className="admin-filters" method="get">
          <label>
            <span className="sr-only">Period</span>
            <select className="input" name="range" defaultValue={range}>
              {Object.entries(RANGES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-check">
            <input type="checkbox" name="bots" value="1" defaultChecked={bots} /> Include bots
          </label>
          <button className="btn" type="submit">
            Show
          </button>
          <a className="btn ghost" href={`/api/admin/export?range=${range}`} download>
            Export CSV
          </a>
        </form>
      </header>

      <section className="admin-stats" aria-label="Right now">
        <Stat label="On the site now" value={data?.activeNow ?? 0} hint="last 5 minutes" live />
        <Stat label="In calls and rooms" value={live?.online ?? 0} />
        <Stat label="In the global chat" value={live?.chatting ?? 0} />
        <Stat label="Waiting for a stranger" value={live?.waiting ?? 0} />
      </section>

      {data ? (
        <>
          <section className="admin-stats" aria-label={RANGES[range]}>
            <Stat label="Visitors" value={data.visitors} hint={`${num(data.newVisitors)} new`} />
            <Stat label="Page views" value={data.views} />
            <Stat label="Time per visitor" text={duration(data.avgSeconds)} />
            <Stat label="Messages sent" value={data.messages} />
            <Stat label="Rooms created" value={data.events.room_created ?? 0} />
            <Stat label="Room joins" value={data.events.room_joined ?? 0} />
            <Stat label="Stranger matches" value={data.events.stranger_matched ?? 0} />
            <Stat label="Bots seen" value={data.bots} hint={bots ? "included" : "hidden from totals"} />
          </section>

          <section className="panel">
            <h2>{RANGES[range]}</h2>
            <DayChart days={data.days} />
          </section>

          <div className="admin-grid">
            <RankList title="Pages" rows={data.pages} />
            <RankList title="Countries" rows={data.countries} render={countryName} />
            <RankList title="Cities" rows={data.cities} />
            <RankList title="Came from" rows={data.referrers} />
            <RankList title="Browsers" rows={data.browsers} />
            <RankList title="Systems" rows={data.systems} />
            <RankList title="Devices" rows={data.devices} />
            <RankList title="Languages" rows={data.languages} />
          </div>

          <section className="panel">
            <h2>Latest activity</h2>
            {events.length ? (
              <ul className="admin-feed">
                {events.map((e, i) => (
                  <li key={i}>
                    <time dateTime={e.at.toISOString()}>{ago(e.at)}</time>
                    <span>
                      {e.name ? <strong>{e.name}</strong> : "Someone"} · {EVENT_LABELS[e.type] ?? e.type}
                      {typeof e.detail?.title === "string" ? ` “${e.detail.title}”` : ""}
                    </span>
                    {e.visitor_id ? <Link href={`/admin/visitors/${e.visitor_id}`}>Visitor</Link> : <span>{e.ip ?? ""}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty">Nothing yet. Activity shows up here as people use the site.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, text, hint, live }: { label: string; value?: number; text?: string; hint?: string; live?: boolean }) {
  return (
    <div className={live ? "admin-stat live" : "admin-stat"}>
      <span className="value">{text ?? num(value ?? 0)}</span>
      <span className="label">{label}</span>
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
