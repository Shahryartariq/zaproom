import { liveKitConfig } from "@/lib/config";
import { NOT_CONFIGURED, error, json, limited } from "@/lib/http";
import { getRoom } from "@/lib/livekit.server";
import { RateLimiter } from "@/lib/rate-limit";
import { isRoomId } from "@/lib/rooms";

const limit = new RateLimiter(60, 60_000);

/** What the pre-join screen needs: the room's name, type and how many are inside. */
export async function GET(req: Request, ctx: RouteContext<"/api/rooms/[id]">) {
  const blocked = limited(limit, req, "room");
  if (blocked) return blocked;
  const { id } = await ctx.params;
  if (!isRoomId(id) || id.startsWith("s-")) return error(404, "This room doesn't exist or has closed.");
  const cfg = liveKitConfig();
  if (!cfg) return error(503, NOT_CONFIGURED);
  try {
    const room = await getRoom(cfg, id);
    if (!room || room.meta.visibility === "stranger") return error(404, "This room doesn't exist or has closed.");
    const { title, topic, kind, visibility } = room.meta;
    return json({ id, title, topic, kind, visibility, count: room.count });
  } catch (e) {
    console.error("[rooms] lookup failed", e);
    return error(502, "Couldn't reach the call server. Try again in a moment.");
  }
}
