import { liveKitConfig } from "@/lib/config";
import { NOT_CONFIGURED, error, json, limited, readBody, sameOrigin } from "@/lib/http";
import { ensureQueueRoom, mintToken } from "@/lib/livekit.server";
import { profileSchema } from "@/lib/profile";
import { RateLimiter } from "@/lib/rate-limit";
import { QUEUE_ROOM } from "@/lib/rooms";
import { signTicket } from "@/lib/ticket";

const limit = new RateLimiter(30, 60_000);

/**
 * Puts you in line to meet someone. You connect to a hidden LiveKit room that can't
 * publish anything; being in it is what "waiting" means, so closing the tab leaves the line.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, "Cross-site requests aren't allowed.");
  const blocked = limited(limit, req, "queue");
  if (blocked) return blocked;
  const cfg = liveKitConfig();
  if (!cfg) return error(503, NOT_CONFIGURED);

  const body = await readBody(req, profileSchema);
  if ("response" in body) return body.response;

  const identity = `st_${crypto.randomUUID()}`;
  try {
    await ensureQueueRoom(cfg);
    const token = await mintToken(cfg, {
      roomId: QUEUE_ROOM,
      identity,
      profile: body.data,
      kind: "voice",
      listenOnly: true,
    });
    return json({ token, url: cfg.url, ticket: signTicket(identity, cfg.apiSecret) });
  } catch (e) {
    console.error("[strangers] queue failed", e);
    return error(502, "Couldn't reach the call server. Try again in a moment.");
  }
}
