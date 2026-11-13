import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { error, limited, readBody, sameOrigin } from "@/lib/http";
import { RateLimiter } from "@/lib/rate-limit";
import { SESSION_COOKIE, SESSION_MS, VISITOR_COOKIE, VISITOR_MAX_AGE, beaconSchema, isUuid, requestInfo } from "@/lib/visitors";
import { prune, recordLeave, recordView } from "@/lib/visitors.server";

const limit = new RateLimiter(120, 60_000);
const none = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/**
 * The visitor log's only door from the browser: a page view (returns its id) or a
 * "left the page" report with time spent. Visitors are told about this on /privacy.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, "Cross-site requests aren't allowed.");
  const blocked = limited(limit, req, "track");
  if (blocked) return blocked;

  const sql = await db().catch((e: unknown) => {
    console.error("[visitors] database unavailable", e);
    return null;
  });
  if (!sql || (await isAdminRequest())) return none();

  const body = await readBody(req, beaconSchema);
  if ("response" in body) return body.response;

  const jar = await cookies();
  const knownVisitor = jar.get(VISITOR_COOKIE)?.value;
  const visitorId = isUuid(knownVisitor) ? knownVisitor : crypto.randomUUID();

  try {
    if (body.data.type === "leave") {
      if (isUuid(knownVisitor)) await recordLeave(sql, visitorId, body.data.viewId, body.data.seconds, body.data.messages);
      return none();
    }

    const knownSession = jar.get(SESSION_COOKIE)?.value;
    const sessionId = isUuid(knownSession) ? knownSession : crypto.randomUUID();
    const viewId = await recordView(sql, {
      visitorId,
      sessionId,
      newSession: !isUuid(knownSession),
      info: requestInfo(req.headers),
      host: req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
      view: body.data,
    });
    // Old rows are cleared on roughly one view in a hundred.
    if (Math.random() < 0.01) void prune(sql).catch((e: unknown) => console.error("[visitors] prune failed", e));

    const res = NextResponse.json({ viewId }, { headers: { "Cache-Control": "no-store" } });
    const secure = process.env.NODE_ENV === "production";
    res.cookies.set({ name: VISITOR_COOKIE, value: visitorId, httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: VISITOR_MAX_AGE });
    res.cookies.set({ name: SESSION_COOKIE, value: sessionId, httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: SESSION_MS / 1000 });
    return res;
  } catch (e) {
    console.error("[visitors] view not recorded", e);
    return none();
  }
}
