import { logEvent } from "@/lib/visitors.server";
import { liveKitConfig } from "@/lib/config";
import { NOT_CONFIGURED, error, json, limited, readBody, sameOrigin } from "@/lib/http";
import { createRoom, lobbySnapshot } from "@/lib/livekit.server";
import { createRoomSchema } from "@/lib/profile";
import { RateLimiter } from "@/lib/rate-limit";
import { newRoomId, type LobbySnapshot } from "@/lib/rooms";

const createLimit = new RateLimiter(6, 10 * 60_000);
const readLimit = new RateLimiter(60, 60_000);

// One LiveKit lookup serves every visitor for a few seconds.
let cached: { at: number; data: LobbySnapshot } | null = null;
let inflight: Promise<LobbySnapshot> | null = null;
const FRESH_MS = 4000;

export async function GET(req: Request) {
  const blocked = limited(readLimit, req, "lobby");
  if (blocked) return blocked;
  const cfg = liveKitConfig();
  if (!cfg) return json({ configured: false, rooms: [], online: 0, waiting: 0, chatting: 0 } satisfies LobbySnapshot);

  if (!cached || Date.now() - cached.at > FRESH_MS) {
    inflight ??= lobbySnapshot(cfg)
      .then((data) => {
        cached = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
    try {
      await inflight;
    } catch (e) {
      console.error("[rooms] lobby lookup failed", e);
      if (!cached) return error(502, "Couldn't reach the call server. Try again in a moment.");
    }
  }
  return json(cached!.data);
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error(403, "Cross-site requests aren't allowed.");
  const blocked = limited(createLimit, req, "create");
  if (blocked) return blocked;
  const cfg = liveKitConfig();
  if (!cfg) return error(503, NOT_CONFIGURED);

  const body = await readBody(req, createRoomSchema);
  if ("response" in body) return body.response;

  const id = newRoomId();
  try {
    await createRoom(cfg, id, { v: 1, ...body.data, createdAt: Date.now() });
  } catch (e) {
    console.error("[rooms] create failed", e);
    return error(502, "Couldn't create the room. Try again in a moment.");
  }
  cached = null;
  const { title, topic, kind, visibility } = body.data;
  logEvent({ type: "room_created", room: id, detail: { title, topic, kind, visibility } });
  return json({ id }, 201);
}
