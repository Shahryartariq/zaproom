import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/http";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new NextResponse("Cross-site requests aren't allowed.", { status: 403 });
  const res = NextResponse.redirect(new URL("/admin/login?signed-out=1", req.url), 303);
  res.cookies.set(sessionCookie("", 0));
  return res;
}
