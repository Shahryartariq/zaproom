import { z } from "zod";
import { liveKitConfig } from "@/lib/config";
import { NOT_CONFIGURED, error, json, limited, readBody, sameOrigin } from "@/lib/http";
import { createRoom, markMatched, mintToken, queueEntries } from "@/lib/livekit.server";
import { findMatch } from "@/lib/pairing";
import { profileSchema } from "@/lib/profile";
import { RateLimiter } from "@/lib/rate-limit";
import { strangerRoomId, verifyTicket } from "@/lib/ticket";

// Clients ask every 1.5 s while waiting.
const limit = new RateLimiter(90, 60_000);
const bodySchema = z.object({ ticket: z.string().max(200) });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, "Cross-site requests aren't allowed.");
  const blocked = limited(limit, req, "match");
  if (blocked) return blocked;
  const cfg = liveKitConfig();
  if (!cfg) return error(503, NOT_CONFIGURED);

  const body = await readBody(req, bodySchema);
  if ("response" in body) return body.response;
  const me = verifyTicket(body.data.ticket, cfg.apiSecret);
  if (!me) return error(401, "Your place in line expired. Start again.");

  try {
    const { entries, infos } = await queueEntries(cfg);
    const result = findMatch(entries, me);
    // Still connecting to the queue, or nobody to pair with yet.
    if (result.status === "absent") return json({ status: "waiting", ahead: 0 });
    if (result.status === "waiting") return json(result);

    const info = infos.find((p) => p.identity === me);
    const profile = profileSchema.safeParse({ name: info?.name, color: info?.attributes?.color });
    if (!profile.success) return error(400, "Your name couldn't be read. Start again.");

    let roomId: string;
    if (result.status === "pair") {
      roomId = strangerRoomId(me, result.partner);
      await createRoom(cfg, roomId, {
        v: 1,
        title: "A stranger",
        topic: "",
        visibility: "stranger",
        kind: "video",
        createdAt: Date.now(),
      });
      await Promise.all([markMatched(cfg, me, roomId), markMatched(cfg, result.partner, roomId)]);
    } else {
      roomId = result.roomId;
    }

    const token = await mintToken(cfg, { roomId, identity: me, profile: profile.data, kind: "video" });
    return json({ status: "matched", roomId, token, url: cfg.url });
  } catch (e) {
    console.error("[strangers] match failed", e);
    return error(502, "Couldn't reach the call server. Try again in a moment.");
  }
}
