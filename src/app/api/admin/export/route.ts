import { adminGuard } from "@/lib/admin-route";
import { exportVisitors, parseRange } from "@/lib/admin.server";
import { db } from "@/lib/db";
import { csvCell } from "@/lib/visitors";

const COLUMNS = [
  "id", "first_seen", "last_seen", "names", "ip", "ips", "country", "region", "city", "latitude", "longitude", "timezone",
  "browser", "browser_version", "os", "os_version", "device", "device_vendor", "device_model", "is_bot", "language",
  "languages", "screen", "viewport", "color_scheme", "client_timezone", "first_referrer", "first_landing",
  "utm_source", "utm_medium", "utm_campaign", "sessions", "page_views", "seconds", "messages", "user_agent",
] as const;

/** Visitors seen in the chosen range, as a CSV file. */
export async function GET(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const sql = await db();
  if (!sql) return new Response("No database is connected.", { status: 503 });
  const range = parseRange(new URL(req.url).searchParams.get("range"));
  const rows = await exportVisitors(sql, range);
  const lines = [
    COLUMNS.join(","),
    ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c] instanceof Date ? (r[c] as Date).toISOString() : r[c])).join(",")),
  ];
  const day = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zaproom-visitors-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
