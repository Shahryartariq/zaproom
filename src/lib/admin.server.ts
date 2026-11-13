import "server-only";
import { db } from "./db";

type Sql = NonNullable<Awaited<ReturnType<typeof db>>>;

/** Days on the admin charts are counted in this time zone (ADMIN_TIMEZONE, default Pakistan). */
export function adminTimeZone(): string {
  const tz = process.env.ADMIN_TIMEZONE?.trim() || "Asia/Karachi";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "Asia/Karachi";
  }
}

export const RANGES = { "1": "Last 24 hours", "7": "Last 7 days", "30": "Last 30 days", "90": "Last 90 days", "365": "Last year" } as const;
export type RangeKey = keyof typeof RANGES;
export const parseRange = (v: unknown): RangeKey => (typeof v === "string" && v in RANGES ? (v as RangeKey) : "7");

export type Count = { label: string; count: number };
export type Overview = {
  visitors: number;
  newVisitors: number;
  views: number;
  avgSeconds: number;
  messages: number;
  bots: number;
  activeNow: number;
  events: Record<string, number>;
  days: { day: string; visitors: number; views: number }[];
  pages: Count[];
  countries: Count[];
  cities: Count[];
  referrers: Count[];
  browsers: Count[];
  systems: Count[];
  devices: Count[];
  languages: Count[];
};

const n = (v: unknown) => Number(v ?? 0);

export async function overview(sql: Sql, range: RangeKey, includeBots: boolean): Promise<Overview> {
  const days = Number(range);
  const since = new Date(Date.now() - days * 24 * 60 * 60_000);
  const tz = adminTimeZone();
  const human = includeBots ? sql`true` : sql`not v.is_bot`;
  const group = (expr: ReturnType<typeof sql>, limit = 8) => sql<{ label: string | null; count: string }[]>`
    select ${expr} as label, count(distinct p.visitor_id) as count
    from zr_page_views p join zr_visitors v on v.id = p.visitor_id
    where p.at >= ${since} and ${human}
    group by 1 order by 2 desc, 1 limit ${limit}
  `;
  const toCounts = (rows: { label: string | null; count: string }[]) =>
    rows.map((r) => ({ label: r.label ?? "Unknown", count: n(r.count) }));

  const [totals, active, events, series, pages, countries, cities, referrers, browsers, systems, devices, languages] =
    await Promise.all([
      sql<{ visitors: string; new_visitors: string; views: string; seconds: string; messages: string; bots: string }[]>`
        select
          count(distinct p.visitor_id) filter (where ${human}) as visitors,
          count(distinct p.visitor_id) filter (where ${human} and v.first_seen >= ${since}) as new_visitors,
          count(*) filter (where ${human}) as views,
          coalesce(sum(p.seconds) filter (where ${human}), 0) as seconds,
          coalesce(sum(p.messages) filter (where ${human}), 0) as messages,
          count(distinct p.visitor_id) filter (where v.is_bot) as bots
        from zr_page_views p join zr_visitors v on v.id = p.visitor_id
        where p.at >= ${since}
      `,
      sql<{ count: string }[]>`
        select count(distinct visitor_id) as count from zr_page_views where at >= now() - interval '5 minutes'
      `,
      sql<{ type: string; count: string }[]>`
        select type, count(*) as count from zr_events where at >= ${since} group by type
      `,
      sql<{ day: string; visitors: string; views: string }[]>`
        with d as (
          select generate_series(
            date_trunc('day', ${since}::timestamptz at time zone ${tz}),
            date_trunc('day', now() at time zone ${tz}),
            interval '1 day'
          ) as day
        )
        select to_char(d.day, 'YYYY-MM-DD') as day,
          count(distinct p.visitor_id) as visitors,
          count(p.id) as views
        from d
        left join zr_page_views p
          on date_trunc('day', p.at at time zone ${tz}) = d.day and p.at >= ${since}
          and exists (select 1 from zr_visitors v where v.id = p.visitor_id and ${human})
        group by d.day order by d.day
      `,
      group(sql`case when p.path ~ '^/r/' then '/r/… (rooms)' else regexp_replace(p.path, '[?#].*$', '') end`, 10),
      group(sql`v.country`),
      group(sql`concat_ws(', ', v.city, v.country)`),
      group(sql`coalesce(substring(v.first_referrer from '^https?://([^/]+)'), 'Direct')`),
      group(sql`v.browser`),
      group(sql`v.os`),
      group(sql`v.device`),
      group(sql`split_part(v.language, '-', 1)`),
    ]);

  const t = totals[0];
  return {
    visitors: n(t?.visitors),
    newVisitors: n(t?.new_visitors),
    views: n(t?.views),
    avgSeconds: n(t?.visitors) ? n(t?.seconds) / n(t?.visitors) : 0,
    messages: n(t?.messages),
    bots: n(t?.bots),
    activeNow: n(active[0]?.count),
    events: Object.fromEntries(events.map((e) => [e.type, n(e.count)])),
    days: series.map((s) => ({ day: s.day, visitors: n(s.visitors), views: n(s.views) })),
    pages: toCounts(pages),
    countries: toCounts(countries),
    cities: toCounts(cities),
    referrers: toCounts(referrers),
    browsers: toCounts(browsers),
    systems: toCounts(systems),
    devices: toCounts(devices),
    languages: toCounts(languages),
  };
}

export type VisitorRow = {
  id: string;
  first_seen: Date;
  last_seen: Date;
  ip: string | null;
  ips: string[];
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  user_agent: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  device: string | null;
  device_vendor: string | null;
  device_model: string | null;
  is_bot: boolean;
  language: string | null;
  languages: string | null;
  screen: string | null;
  viewport: string | null;
  color_scheme: string | null;
  client_timezone: string | null;
  first_referrer: string | null;
  first_landing: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  sessions: number;
  page_views: number;
  seconds: number;
  messages: number;
  names: string[];
};

export const PAGE_SIZE = 50;

/** Visitors, newest first, matching a search over IP, place, name, browser, system or id. */
export async function listVisitors(
  sql: Sql,
  opts: { q?: string; bots?: boolean; page?: number },
): Promise<{ rows: VisitorRow[]; total: number }> {
  const q = opts.q?.trim().slice(0, 100) ?? "";
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const where = sql`
    where (${opts.bots ? sql`true` : sql`not is_bot`})
    and (${q === ""} or ip ilike ${like} or array_to_string(ips, ' ') ilike ${like}
      or concat_ws(' ', city, region, country) ilike ${like} or array_to_string(names, ' ') ilike ${like}
      or concat_ws(' ', browser, os, device, device_vendor, device_model) ilike ${like} or id::text ilike ${like})
  `;
  const page = Math.max(1, Math.min(10_000, Math.floor(opts.page ?? 1)));
  const [rows, count] = await Promise.all([
    sql<VisitorRow[]>`select * from zr_visitors ${where} order by last_seen desc limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`,
    sql<{ count: string }[]>`select count(*) as count from zr_visitors ${where}`,
  ]);
  return { rows, total: n(count[0]?.count) };
}

export type TimelineItem =
  | { kind: "view"; at: Date; path: string; title: string | null; referrer: string | null; seconds: number | null; messages: number; ip: string | null; place: string | null }
  | { kind: "event"; at: Date; type: string; room: string | null; name: string | null; identity: string | null; ip: string | null; detail: Record<string, unknown> | null };

export async function visitorDetail(sql: Sql, id: string): Promise<{ visitor: VisitorRow; timeline: TimelineItem[] } | null> {
  const [visitor] = await sql<VisitorRow[]>`select * from zr_visitors where id = ${id}`;
  if (!visitor) return null;
  const [views, events] = await Promise.all([
    sql<{ at: Date; path: string; title: string | null; referrer: string | null; seconds: number | null; messages: number; ip: string | null; country: string | null; city: string | null }[]>`
      select at, path, title, referrer, seconds, messages, ip, country, city from zr_page_views
      where visitor_id = ${id} order by at desc limit 300
    `,
    sql<{ at: Date; type: string; room: string | null; name: string | null; identity: string | null; ip: string | null; detail: Record<string, unknown> | null }[]>`
      select at, type, room, name, identity, ip, detail from zr_events where visitor_id = ${id} order by at desc limit 300
    `,
  ]);
  const timeline: TimelineItem[] = [
    ...views.map((v) => ({
      kind: "view" as const,
      at: v.at,
      path: v.path,
      title: v.title,
      referrer: v.referrer,
      seconds: v.seconds,
      messages: v.messages,
      ip: v.ip,
      place: [v.city, v.country].filter(Boolean).join(", ") || null,
    })),
    ...events.map((e) => ({ kind: "event" as const, ...e })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  return { visitor, timeline };
}

/** The visitor behind a LiveKit identity, from the event recorded when their pass was issued. */
export async function visitorsByIdentity(sql: Sql, identities: string[]): Promise<Map<string, string>> {
  if (!identities.length) return new Map();
  const rows = await sql<{ identity: string; visitor_id: string }[]>`
    select distinct on (identity) identity, visitor_id from zr_events
    where identity = any(${identities}) and visitor_id is not null
    order by identity, at desc
  `;
  return new Map(rows.map((r) => [r.identity, r.visitor_id]));
}

export type RecentEvent = { at: Date; type: string; room: string | null; name: string | null; visitor_id: string | null; ip: string | null; detail: Record<string, unknown> | null };

export async function recentEvents(sql: Sql, limit = 25): Promise<RecentEvent[]> {
  return sql<RecentEvent[]>`select at, type, room, name, visitor_id, ip, detail from zr_events order by at desc limit ${limit}`;
}

export async function exportVisitors(sql: Sql, range: RangeKey): Promise<VisitorRow[]> {
  const since = new Date(Date.now() - Number(range) * 24 * 60 * 60_000);
  return sql<VisitorRow[]>`select * from zr_visitors where last_seen >= ${since} order by last_seen desc limit 50000`;
}

export async function deleteVisitor(sql: Sql, id: string): Promise<boolean> {
  const rows = await sql`delete from zr_visitors where id = ${id} returning id`;
  return rows.length > 0;
}
