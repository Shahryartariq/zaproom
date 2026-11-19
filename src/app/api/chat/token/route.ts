import { z } from "@/lib/zod";
import { liveKitConfig } from "@/lib/config";
import { DEVICE_KEY, deviceIdentity } from "@/lib/device";
import { NOT_CONFIGURED, error, json, limited, readBody, sameOrigin } from "@/lib/http";
import { ensureLoungeRoom, mintToken } from "@/lib/livekit.server";
import { profileSchema } from "@/lib/profile";
import { RateLimiter } from "@/lib/rate-limit";
import { LOUNGE_ROOM } from "@/lib/rooms";

const limit = new RateLimiter(20, 60_000);
const bodySchema = profileSchema.extend({ device: z.string().regex(DEVICE_KEY, "Reload the page and try again.") });

/**
 * A pass for the global chat. The identity comes from the browser's device key, so it
 * stays the same across reloads and your direct messages keep their history.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, "Cross-site requests aren't allowed.");
  const blocked = limited(limit, req, "chat");
  if (blocked) return blocked;
  const cfg = liveKitConfig();
  if (!cfg) return error(503, NOT_CONFIGURED);

  const body = await readBody(req, bodySchema);
  if ("response" in body) return body.response;
  const { device, name, color } = body.data;
  const identity = deviceIdentity(device, cfg.apiSecret);

  try {
    await ensureLoungeRoom(cfg);
    const token = await mintToken(cfg, { roomId: LOUNGE_ROOM, identity, profile: { name, color }, kind: "text" });
    return json({ token, url: cfg.url, identity });
  } catch (e) {
    console.error("[chat] token failed", e);
    return error(502, "Couldn't reach the chat server. Try again in a moment.");
  }
}
