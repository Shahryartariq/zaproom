import { z } from "@/lib/zod";
import { liveKitConfig } from "@/lib/config";
import { NOT_CONFIGURED, error, json, limited, readBody, sameOrigin } from "@/lib/http";
import { getRoom, mintToken } from "@/lib/livekit.server";
import { profileSchema } from "@/lib/profile";
import { RateLimiter } from "@/lib/rate-limit";
import { ROOM_ID, roomLimit } from "@/lib/rooms";

const limit = new RateLimiter(20, 60_000);

const bodySchema = profileSchema.extend({ roomId: z.string().regex(ROOM_ID, "That isn't a Zaproom link.") });

/** Hands out a 2-hour pass for one room. Rooms must already exist: nobody can invent one here. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, "Cross-site requests aren't allowed.");
  const blocked = limited(limit, req, "token");
  if (blocked) return blocked;
  const cfg = liveKitConfig();
  if (!cfg) return error(503, NOT_CONFIGURED);

  const body = await readBody(req, bodySchema);
  if ("response" in body) return body.response;
  const { roomId, name, color } = body.data;

  try {
    const room = await getRoom(cfg, roomId);
    if (!room || room.meta.visibility === "stranger") return error(404, "This room doesn't exist or has closed.");
    const limit = roomLimit(room.meta.kind);
    if (room.count >= limit) return error(409, `This room is full (${limit} people). Try again later or start your own.`);
    const token = await mintToken(cfg, {
      roomId,
      identity: `g_${crypto.randomUUID()}`,
      profile: { name, color },
      kind: room.meta.kind,
    });
    return json({ token, url: cfg.url });
  } catch (e) {
    console.error("[token] failed", e);
    return error(502, "Couldn't reach the call server. Try again in a moment.");
  }
}
