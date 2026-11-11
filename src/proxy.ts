import { NextResponse, type NextRequest } from "next/server";

/** Where the browser may open call connections: LiveKit Cloud, or the configured server. */
function liveKitSources(): string {
  const sources = new Set(["wss://*.livekit.cloud", "https://*.livekit.cloud"]);
  const raw = process.env.LIVEKIT_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw);
      sources.add(`${url.protocol}//${url.host}`);
      sources.add(`${url.protocol === "wss:" ? "https:" : "http:"}//${url.host}`);
    } catch {
      // A malformed URL is reported by the API routes; the policy just doesn't widen.
    }
  }
  return [...sources].join(" ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const ga = "https://www.googletagmanager.com";
  const gaConnect = "https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${ga}${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `img-src 'self' data: blob: ${ga} https://*.google-analytics.com`,
    "font-src 'self'",
    `connect-src 'self' ${liveKitSources()} ${gaConnect}${dev ? " ws:" : ""}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
