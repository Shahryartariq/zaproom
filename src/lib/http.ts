import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientKey, type RateLimiter } from "./rate-limit";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function error(status: number, message: string, headers: Record<string, string> = {}) {
  return json({ error: message }, status, headers);
}

export const NOT_CONFIGURED = "Calls aren't switched on for this site yet. The owner needs to add LiveKit keys.";

/** Returns a 429 response, or null when the request may continue. */
export function limited(limiter: RateLimiter, req: Request, scope: string) {
  const wait = limiter.check(`${scope}:${clientKey(req.headers)}`);
  return wait ? error(429, `Too many requests. Try again in ${wait} seconds.`, { "Retry-After": String(wait) }) : null;
}

/** Parses a small JSON body with a schema. Returns the data or an error response. */
export async function readBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.output<S> } | { response: NextResponse }> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return { response: error(415, "Send JSON.") };
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > 4096) return { response: error(413, "Request is too large.") };
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { response: error(400, "Request body isn't valid JSON.") };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: error(400, parsed.error.issues[0]?.message ?? "Check the form and try again.") };
  }
  return { data: parsed.data };
}

/** Blocks cross-site form posts. Browsers always send Origin on POST from scripts. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}
