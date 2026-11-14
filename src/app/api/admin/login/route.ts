import { NextResponse } from "next/server";
import { ADMIN_SESSION_SECONDS, adminPassword, checkPassword, createSession, sessionCookie } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/http";
import { db } from "@/lib/db";
import { RateLimiter, clientKey } from "@/lib/rate-limit";
import { requestInfo } from "@/lib/visitors";
import { logEvent, recentLoginFailures } from "@/lib/visitors.server";

// Five tries per 15 minutes per address. The in-memory count is per server instance;
// with a database the count is shared, and too many failures from anywhere pause sign-in.
const limit = new RateLimiter(5, 15 * 60_000);
const PER_IP = 5;
const EVERYONE = 50;

async function throttled(req: Request): Promise<boolean> {
  if (limit.check(`admin:${clientKey(req.headers)}`)) return true;
  const sql = await db().catch(() => null);
  if (!sql) return false;
  const failures = await recentLoginFailures(sql, requestInfo(req.headers).ip).catch(() => null);
  return !!failures && (failures.fromIp >= PER_IP || failures.total >= EVERYONE);
}

const back = (req: Request, query: string) => NextResponse.redirect(new URL(`/admin/login${query}`, req.url), 303);

/** Sign-in form post. Answers with redirects so the form works without JavaScript. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse("Cross-site requests aren't allowed.", { status: 403 });
  if (!adminPassword()) return back(req, "?error=off");
  if (await throttled(req)) return back(req, "?error=wait");

  const form = await req.formData().catch(() => null);
  const attempt = form?.get("password");
  if (typeof attempt !== "string" || attempt.length > 200 || !checkPassword(attempt)) {
    logEvent({ type: "admin_login_failed" });
    return back(req, "?error=wrong");
  }
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  res.cookies.set(sessionCookie(createSession(), ADMIN_SESSION_SECONDS));
  return res;
}
