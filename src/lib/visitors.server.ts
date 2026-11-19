import "server-only";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { isAdminRequest } from "./admin-auth";
import { db } from "./db";
import {
  VISITOR_COOKIE,
  externalReferrer,
  isUuid,
  requestInfo,
  utmFrom,
  type RequestInfo,
  type ViewBeacon,
} from "./visitors";

type Sql = NonNullable<Awaited<ReturnType<typeof db>>>;

/** Rows older than this are deleted now and then. Set VISITOR_RETENTION_DAYS to change it. */
export function retentionDays(): number {
  const n = Number(process.env.VISITOR_RETENTION_DAYS);
  return Number.isInteger(n) && n >= 7 && n <= 3650 ? n : 365;
}

async function upsertVisitor(sql: Sql, id: string, info: RequestInfo, extra: Partial<Record<string, string | null>> = {}) {
  await sql`
    insert into zr_visitors ${sql({
      id,
      ip: info.ip,
      ips: info.ip ? [info.ip] : [],
      country: info.country,
      region: info.region,
      city: info.city,
      latitude: info.latitude,
      longitude: info.longitude,
      timezone: info.timezone,
      user_agent: info.userAgent,
      browser: info.browser,
      browser_version: info.browserVersion,
      os: info.os,
      os_version: info.osVersion,
      device: info.device,
      device_vendor: info.deviceVendor,
      device_model: info.deviceModel,
      is_bot: info.isBot,
      ...extra,
    })}
    on conflict (id) do update set
      last_seen = now(),
      ip = coalesce(excluded.ip, zr_visitors.ip),
      ips = case
        when excluded.ip is null or excluded.ip = any(zr_visitors.ips) then zr_visitors.ips
        else (zr_visitors.ips || excluded.ip)[greatest(1, cardinality(zr_visitors.ips) - 18):]
      end,
      country = coalesce(excluded.country, zr_visitors.country),
      region = coalesce(excluded.region, zr_visitors.region),
      city = coalesce(excluded.city, zr_visitors.city),
      latitude = coalesce(excluded.latitude, zr_visitors.latitude),
      longitude = coalesce(excluded.longitude, zr_visitors.longitude),
      timezone = coalesce(excluded.timezone, zr_visitors.timezone),
      user_agent = coalesce(excluded.user_agent, zr_visitors.user_agent),
      browser = coalesce(excluded.browser, zr_visitors.browser),
      browser_version = coalesce(excluded.browser_version, zr_visitors.browser_version),
      os = coalesce(excluded.os, zr_visitors.os),
      os_version = coalesce(excluded.os_version, zr_visitors.os_version),
      device = excluded.device,
      device_vendor = coalesce(excluded.device_vendor, zr_visitors.device_vendor),
      device_model = coalesce(excluded.device_model, zr_visitors.device_model),
      is_bot = zr_visitors.is_bot or excluded.is_bot
  `;
}

/** A page view from the tracker. Returns the view's id, used later to record time spent. */
export async function recordView(
  sql: Sql,
  opts: { visitorId: string; sessionId: string; newSession: boolean; info: RequestInfo; host: string | null; view: ViewBeacon },
): Promise<number> {
  const { visitorId, sessionId, newSession, info, host, view } = opts;
  const referrer = externalReferrer(view.referrer, host);
  const utm = utmFrom(view.path);
  await upsertVisitor(sql, visitorId, info, {
    first_referrer: referrer,
    first_landing: view.path,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
  });
  const [row] = await sql<{ id: string }[]>`
    with v as (
      update zr_visitors set
        page_views = page_views + 1,
        sessions = sessions + ${newSession ? 1 : 0},
        language = coalesce(${view.lang ?? null}, language),
        languages = coalesce(${view.langs ?? null}, languages),
        screen = coalesce(${view.screen ?? null}, screen),
        viewport = coalesce(${view.viewport ?? null}, viewport),
        color_scheme = coalesce(${view.scheme ?? null}, color_scheme),
        client_timezone = coalesce(${view.tz ?? null}, client_timezone),
        first_referrer = coalesce(first_referrer, ${referrer})
      where id = ${visitorId}
    )
    insert into zr_page_views (visitor_id, session_id, path, title, referrer, ip, country, city)
    values (${visitorId}, ${sessionId}, ${view.path}, ${view.title ?? null}, ${referrer}, ${info.ip}, ${info.country}, ${info.city})
    returning id
  `;
  return Number(row?.id);
}

/** Time spent on a page and messages sent there, sent when the page is left. */
export async function recordLeave(sql: Sql, visitorId: string, viewId: number, seconds: number, messages: number) {
  const [view] = await sql<{ seconds: number | null }[]>`
    select seconds from zr_page_views where id = ${viewId} and visitor_id = ${visitorId}
  `;
  if (!view) return;
  // A page can report twice (tab hidden, then closed): count only the extra time.
  const added = Math.max(0, seconds - (view.seconds ?? 0));
  await sql`
    update zr_page_views set seconds = greatest(coalesce(seconds, 0), ${seconds}), messages = messages + ${messages}
    where id = ${viewId}
  `;
  await sql`
    update zr_visitors set seconds = seconds + ${added}, messages = messages + ${messages}, last_seen = now()
    where id = ${visitorId}
  `;
}

export type EventInput = {
  type: string;
  room?: string | null;
  name?: string | null;
  identity?: string | null;
  detail?: Record<string, unknown>;
};

/** Stores one event and adds the name used to the visitor's list of names. */
export async function recordEvent(sql: Sql, visitorId: string | null, info: RequestInfo, event: EventInput): Promise<void> {
  if (visitorId) {
    await upsertVisitor(sql, visitorId, info);
    if (event.name) {
      await sql`
        update zr_visitors set names = array_append(names, ${event.name})
        where id = ${visitorId} and not (${event.name} = any(names)) and cardinality(names) < 30
      `;
    }
  }
  await sql`
    insert into zr_events (visitor_id, type, room, name, identity, ip, detail)
    values (${visitorId}, ${event.type}, ${event.room ?? null}, ${event.name ?? null}, ${event.identity ?? null},
            ${info.ip}, ${event.detail ? sql.json(event.detail as never) : null})
  `;
}

/**
 * Records something a visitor did (created a room, joined the chat…) after the response
 * is sent, so it never slows the request down. Skipped for the admin and without a database.
 */
export function logEvent(event: EventInput): void {
  after(async () => {
    try {
      const sql = await db();
      if (!sql) return;
      const [h, jar] = await Promise.all([headers(), cookies()]);
      if (await isAdminRequest()) return;
      const cookie = jar.get(VISITOR_COOKIE)?.value;
      await recordEvent(sql, isUuid(cookie) ? cookie : null, requestInfo(h), event);
    } catch (e) {
      console.error("[visitors] event not recorded", e);
    }
  });
}

/** Deletes rows older than the retention period. Run now and then, not on every request. */
export async function prune(sql: Sql, days = retentionDays()): Promise<void> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60_000);
  await sql`delete from zr_page_views where at < ${cutoff}`;
  await sql`delete from zr_events where at < ${cutoff}`;
  await sql`delete from zr_visitors where last_seen < ${cutoff}`;
}
