import "server-only";

export type LiveKitConfig = { url: string; apiKey: string; apiSecret: string };

/** LiveKit settings, or null when the site runs without them (previews, first deploy). */
export function liveKitConfig(): LiveKitConfig | null {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  if (!/^wss?:\/\//.test(url)) return null;
  return { url, apiKey, apiSecret };
}

export function siteUrl(): string {
  const raw = process.env.SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function gaId(): string | null {
  const id = process.env.GA_MEASUREMENT_ID?.trim();
  return id && /^G-[A-Z0-9]{4,16}$/.test(id) ? id : null;
}

export function siteVerification(): string | null {
  const token = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  return token && /^[\w-]{10,100}$/.test(token) ? token : null;
}
