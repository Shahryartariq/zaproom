import { UAParser } from "ua-parser-js";
import { z } from "@/lib/zod";

/** Pure helpers for the visitor log: reading requests and shaping data. No database here. */

export const VISITOR_COOKIE = "zr_vid";
export const SESSION_COOKIE = "zr_sid";
/** A session ends after 30 minutes without a page view. */
export const SESSION_MS = 30 * 60_000;
export const VISITOR_MAX_AGE = 400 * 24 * 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

const short = (max: number) => z.string().trim().max(max).optional();

/** What the browser reports on each page view. Everything is optional and capped. */
export const viewSchema = z.object({
  type: z.literal("view"),
  path: z.string().trim().min(1).max(500).startsWith("/"),
  title: short(200),
  referrer: short(500),
  screen: short(20),
  viewport: short(20),
  lang: short(35),
  langs: short(200),
  tz: short(64),
  scheme: z.enum(["dark", "light"]).optional(),
});

/** Sent when a page is left: time spent and messages sent on it. */
export const leaveSchema = z.object({
  type: z.literal("leave"),
  viewId: z.number().int().positive(),
  seconds: z.number().int().min(0).max(24 * 60 * 60),
  messages: z.number().int().min(0).max(10_000).default(0),
});

export const beaconSchema = z.discriminatedUnion("type", [viewSchema, leaveSchema]);
export type ViewBeacon = z.infer<typeof viewSchema>;

export type RequestInfo = {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  userAgent: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  device: "desktop" | "mobile" | "tablet" | "bot" | "other";
  deviceVendor: string | null;
  deviceModel: string | null;
  isBot: boolean;
};

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|slack|curl|wget|python|axios|node-fetch|go-http|java\/|phantom|puppeteer|playwright/i;

export function isBot(userAgent: string | null | undefined): boolean {
  return !userAgent || BOT.test(userAgent);
}

/** The visitor's address. Vercel puts the real one first in x-forwarded-for. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim() || null;
  return ip && ip.length <= 64 ? ip : null;
}

const header = (headers: Headers, name: string, max = 100): string | null => {
  const raw = headers.get(name)?.trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).slice(0, max);
  } catch {
    return raw.slice(0, max);
  }
};

const coord = (value: string | null, limit: number): number | null => {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
};

/** Location from Vercel's edge (approximate: city level), and the parsed user agent. */
export function requestInfo(headers: Headers): RequestInfo {
  const userAgent = headers.get("user-agent")?.slice(0, 500) ?? null;
  const ua = new UAParser(userAgent ?? "").getResult();
  const bot = isBot(userAgent);
  const type = ua.device.type;
  const device: RequestInfo["device"] = bot
    ? "bot"
    : type === "mobile"
      ? "mobile"
      : type === "tablet"
        ? "tablet"
        : type === undefined
          ? "desktop"
          : "other";
  const country = header(headers, "x-vercel-ip-country", 2);
  return {
    ip: clientIp(headers),
    country: country && /^[A-Z]{2}$/.test(country) ? country : null,
    region: header(headers, "x-vercel-ip-country-region", 10),
    city: header(headers, "x-vercel-ip-city"),
    latitude: coord(headers.get("x-vercel-ip-latitude"), 90),
    longitude: coord(headers.get("x-vercel-ip-longitude"), 180),
    timezone: header(headers, "x-vercel-ip-timezone", 64),
    userAgent,
    browser: ua.browser.name ?? null,
    browserVersion: ua.browser.version ?? null,
    os: ua.os.name ?? null,
    osVersion: ua.os.version ?? null,
    device,
    deviceVendor: ua.device.vendor ?? null,
    deviceModel: ua.device.model ?? null,
    isBot: bot,
  };
}

/** Campaign tags from the first page someone landed on. */
export function utmFrom(path: string): { source: string | null; medium: string | null; campaign: string | null } {
  const params = new URL(path, "http://x").searchParams;
  const get = (k: string) => params.get(k)?.trim().slice(0, 100) || null;
  return { source: get("utm_source"), medium: get("utm_medium"), campaign: get("utm_campaign") };
}

/** A referrer from another site, or null for internal navigation and empty values. */
export function externalReferrer(referrer: string | null | undefined, host: string | null): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (host && url.host === host) return null;
    return url.href.slice(0, 500);
  } catch {
    return null;
  }
}

/** "PK" → 🇵🇰 */
export function flag(country: string | null | undefined): string {
  if (!country || !/^[A-Z]{2}$/.test(country)) return "";
  return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Seconds as "45s", "3m 20s", "2h 5m". */
export function duration(seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(seconds ?? 0));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** One CSV cell, quoted, with spreadsheet formulas neutralised. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const EVENT_LABELS: Record<string, string> = {
  room_created: "Created a room",
  room_joined: "Joined a room",
  chat_joined: "Joined the global chat",
  stranger_queued: "Started looking for a stranger",
  stranger_matched: "Matched with a stranger",
  admin_login_failed: "Failed admin sign-in",
};
