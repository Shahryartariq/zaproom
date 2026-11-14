import { liveKitConfig } from "@/lib/config";
import { adminGuard, backTo } from "@/lib/admin-route";
import { visitorsByIdentity } from "@/lib/admin.server";
import { db } from "@/lib/db";
import { closeRoom, removePerson } from "@/lib/livekit.server";
import { LOUNGE_ROOM, QUEUE_ROOM } from "@/lib/rooms";
import { blockVisitor } from "@/lib/visitors.server";

const NAME = /^[\w.:-]{1,128}$/;

/** Close a room, remove one person from it, or remove and block them for a day. */
export async function POST(req: Request) {
  const denied = await adminGuard(req);
  if (denied) return denied;
  const cfg = liveKitConfig();
  if (!cfg) return backTo(req, "/admin/rooms?error=livekit");

  const form = await req.formData().catch(() => null);
  const action = form?.get("action");
  const room = form?.get("room");
  const identity = form?.get("identity");
  if (typeof room !== "string" || !NAME.test(room)) return backTo(req, "/admin/rooms?error=input");

  try {
    if (action === "close") {
      // The global chat and the stranger queue are built in; remove people from them instead.
      if (room === LOUNGE_ROOM || room === QUEUE_ROOM) return backTo(req, "/admin/rooms?error=builtin");
      await closeRoom(cfg, room);
      return backTo(req, "/admin/rooms?done=closed");
    }
    if ((action === "remove" || action === "block") && typeof identity === "string" && NAME.test(identity)) {
      let done = "removed";
      if (action === "block") {
        const sql = await db();
        const visitor = sql ? (await visitorsByIdentity(sql, [identity])).get(identity) : undefined;
        if (!sql || !visitor) return backTo(req, "/admin/rooms?error=norecord");
        await blockVisitor(sql, visitor, 24, `Removed from ${room}`);
        done = "blocked";
      }
      await removePerson(cfg, room, identity);
      return backTo(req, `/admin/rooms?done=${done}`);
    }
    return backTo(req, "/admin/rooms?error=input");
  } catch (e) {
    console.error("[admin] room action failed", e);
    return backTo(req, "/admin/rooms?error=failed");
  }
}
