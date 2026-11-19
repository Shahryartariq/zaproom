import "server-only";
import { NextResponse } from "next/server";
import { isAdminRequest } from "./admin-auth";
import { sameOrigin } from "./http";

/** For admin API routes: null when the request may go ahead, otherwise the response to send. */
export async function adminGuard(req: Request): Promise<NextResponse | null> {
  if (req.method !== "GET" && !sameOrigin(req)) return new NextResponse("Cross-site requests aren't allowed.", { status: 403 });
  if (!(await isAdminRequest())) return new NextResponse("Sign in at /admin/login first.", { status: 401 });
  return null;
}

export const backTo = (req: Request, path: string) => NextResponse.redirect(new URL(path, req.url), 303);
